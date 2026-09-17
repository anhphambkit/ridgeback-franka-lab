import { useGLTF } from '@react-three/drei'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react'
import { AxesHelper, Box3, Matrix4, Mesh, Object3D, Quaternion, Vector3 } from 'three'
import { OBB } from 'three/examples/jsm/math/OBB.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import modelUrl from '../../ridgeback_franka.optimized.glb?url'
import { JOINTS, gripperFingerPositionMeters, normalizeJointPose, type JointPose } from '../config/joints'
import { findOwnedVisualMesh } from '../lib/robotColliders'

type Props = {
  joints?: JointPose
  gripperWidthMm?: number
  showJointAxes?: boolean
  onControllerReady?: () => void
}

export type CollisionHit = { a: string, b: string }
export type SafeJointRange = { min: number, max: number }
export type JointMoveResult = { pose: JointPose, collision: CollisionHit | null }

export type RobotModelHandle = {
  resolveJointMove: (current: JointPose, index: number, target: number) => JointMoveResult
  getSafeJointRange: (current: JointPose, index: number) => SafeJointRange
  getPoseCollision: (pose: JointPose) => CollisionHit | null
}

type LinkCollider = {
  name: string
  mesh: Mesh
  local: OBB
  world: OBB
}

const COLLIDER_NODES = ['Base', 'FrontLaser', 'RearLaser', 'Link0', 'Link1', 'Link2', 'Link3', 'Link4', 'Link5', 'Link6', 'Link7', 'Hand', 'LeftFinger', 'RightFinger'] as const
const CHAIN_NODES = ['Base', 'Link0', 'Link1', 'Link2', 'Link3', 'Link4', 'Link5', 'Link6', 'Link7', 'Hand'] as const
const SWEEP_STEP_DEGREES = 1
const BOUNDARY_REFINEMENT_STEPS = 6
const SLIDER_PRECISION = 10
const LEFT_FINGER_ORIENTATION_CORRECTION = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)

function roundInsideSafeBoundary(angle: number, direction: number): number {
  if (direction > 0) return Math.floor((angle + Number.EPSILON) * SLIDER_PRECISION) / SLIDER_PRECISION
  if (direction < 0) return Math.ceil((angle - Number.EPSILON) * SLIDER_PRECISION) / SLIDER_PRECISION
  return angle
}

function collisionPairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

const EXTRA_IGNORED_PAIRS = new Set([
  collisionPairKey('Base', 'FrontLaser'),
  collisionPairKey('Base', 'RearLaser'),
  collisionPairKey('LeftFinger', 'RightFinger'),
  collisionPairKey('LeftFinger', 'Link7'),
  collisionPairKey('RightFinger', 'Link7'),
])

function shouldIgnoreCollision(a: string, b: string): boolean {
  if (EXTRA_IGNORED_PAIRS.has(collisionPairKey(a, b))) return true
  const aIndex = CHAIN_NODES.indexOf(a as typeof CHAIN_NODES[number])
  const bIndex = CHAIN_NODES.indexOf(b as typeof CHAIN_NODES[number])
  // OBBs around neighboring joint housings overlap by design. Ignore links up
  // to two steps apart; meaningful self-collision occurs between distant links.
  if (aIndex >= 0 && bIndex >= 0) return Math.abs(aIndex - bIndex) <= 2
  if ((a === 'Hand' && /Finger$/.test(b)) || (b === 'Hand' && /Finger$/.test(a))) return true
  return false
}

export const RobotModel = forwardRef<RobotModelHandle, Props>(function RobotModel({ joints, gripperWidthMm = 0, showJointAxes = false, onControllerReady }, ref) {
  const gltf = useGLTF(modelUrl)

  // useEffect(() => {
  //   gltf.scene.traverse((object) => {
  //     console.log({
  //       name: object.name,
  //       type: object.type,
  //       parent: object.parent?.name,
  //     })
  //   })
  // }, [gltf.scene])
  const model = useMemo(() => {
    const scene = clone(gltf.scene)
    const restQuaternions = new Map<string, Quaternion>()
    const jointAxesHelpers: AxesHelper[] = []
    JOINTS.forEach(({ node }) => {
      const part = scene.getObjectByName(node)
      if (!part) throw new Error(`Robot model is missing required node: ${node}`)
      restQuaternions.set(node, part.quaternion.clone())

      const axes = new AxesHelper(0.12)
      axes.name = `${node}_AxesHelper`
      part.add(axes)
      jointAxesHelpers.push(axes)
    })
    const leftFinger = scene.getObjectByName('LeftFinger')
    const rightFinger = scene.getObjectByName('RightFinger')
    if (!leftFinger || !rightFinger) throw new Error('Robot model is missing gripper fingers')

    // Both supplied finger meshes have the same orientation. Turn the left
    // finger around its long local Y axis so the two textured pads face inward.
    leftFinger.quaternion.multiply(LEFT_FINGER_ORIENTATION_CORRECTION)

    const colliders = COLLIDER_NODES.map((name): LinkCollider => {
      const object = scene.getObjectByName(name)
      const mesh = object && findOwnedVisualMesh(object)
      if (!mesh) throw new Error(`Robot model is missing collision mesh for node: ${name}`)
      mesh.geometry.computeBoundingBox()
      if (!mesh.geometry.boundingBox) throw new Error(`Robot collision mesh has no bounds: ${name}`)
      const local = new OBB().fromBox3(mesh.geometry.boundingBox)
      return { name, mesh, local, world: local.clone() }
    })

    // Measure the actual closed-state mesh gap in Hand-local coordinates. The
    // supplied asset overlaps the two finger bounds slightly at its rest pose,
    // so using this calibration makes the UI value equal the geometric gap.
    scene.updateMatrixWorld(true)
    const hand = scene.getObjectByName('Hand')
    if (!hand || !leftFinger || !rightFinger) throw new Error('Robot model is missing gripper nodes')
    const handInverse = new Matrix4().copy(hand.matrixWorld).invert()
    const leftBounds = new Box3().setFromObject(leftFinger).applyMatrix4(handInverse)
    const rightBounds = new Box3().setFromObject(rightFinger).applyMatrix4(handInverse)
    const handVisual = findOwnedVisualMesh(hand)
    if (!handVisual) throw new Error('Robot model is missing the Hand visual mesh')
    const handBounds = new Box3().setFromObject(handVisual).applyMatrix4(handInverse)
    const gripperCenterMeters = (handBounds.min.z + handBounds.max.z) / 2
    const fingerInnerOffsets = new Map([
      ['LeftFinger', leftBounds.min.z - leftFinger.position.z],
      ['RightFinger', rightBounds.max.z - rightFinger.position.z],
    ])

    return { scene, restQuaternions, jointAxesHelpers, gripperCenterMeters, fingerInnerOffsets, colliders }
  }, [gltf.scene])

  const applyPose = useCallback((pose: JointPose) => {
    JOINTS.forEach(({ node, axis }, index) => {
      const part = model.scene.getObjectByName(node)
      const rest = model.restQuaternions.get(node)
      if (!part || !rest) return
      const angle = (pose[index]! * Math.PI) / 180
      part.quaternion.copy(rest).multiply(new Quaternion().setFromAxisAngle(axis, angle))
    })
    model.scene.updateMatrixWorld(true)
  }, [model])

  const findCollision = useCallback((): CollisionHit | null => {
    model.colliders.forEach((collider) => {
      collider.world.copy(collider.local).applyMatrix4(collider.mesh.matrixWorld)
    })
    for (let i = 0; i < model.colliders.length; i += 1) {
      for (let j = i + 1; j < model.colliders.length; j += 1) {
        const a = model.colliders[i]!
        const b = model.colliders[j]!
        if (shouldIgnoreCollision(a.name, b.name)) continue
        if (a.world.intersectsOBB(b.world)) return { a: a.name, b: b.name }
      }
    }
    return null
  }, [model])

  const evaluatePose = useCallback((pose: JointPose): CollisionHit | null => {
    applyPose(pose)
    return findCollision()
  }, [applyPose, findCollision])

  const refineBoundary = useCallback((current: JointPose, index: number, safeAngle: number, collidingAngle: number): number => {
    let safe = safeAngle
    let blocked = collidingAngle
    for (let iteration = 0; iteration < BOUNDARY_REFINEMENT_STEPS; iteration += 1) {
      const midpoint = (safe + blocked) / 2
      const candidate = [...current] as JointPose
      candidate[index] = midpoint
      if (evaluatePose(candidate)) blocked = midpoint
      else safe = midpoint
    }
    return safe
  }, [evaluatePose])

  const sweepToLimit = useCallback((current: JointPose, index: number, limit: number): { angle: number, collision: CollisionHit | null } => {
    const start = current[index]!
    const direction = Math.sign(limit - start)
    if (direction === 0) return { angle: start, collision: null }
    let safeAngle = start
    for (let angle = start + direction * SWEEP_STEP_DEGREES; direction > 0 ? angle < limit : angle > limit; angle += direction * SWEEP_STEP_DEGREES) {
      const candidate = [...current] as JointPose
      candidate[index] = angle
      const collision = evaluatePose(candidate)
      if (collision) return { angle: refineBoundary(current, index, safeAngle, angle), collision }
      safeAngle = angle
    }
    const candidate = [...current] as JointPose
    candidate[index] = limit
    const collision = evaluatePose(candidate)
    if (collision) return { angle: refineBoundary(current, index, safeAngle, limit), collision }
    return { angle: limit, collision: null }
  }, [evaluatePose, refineBoundary])

  useImperativeHandle(ref, () => ({
    getPoseCollision(pose) {
      const normalized = normalizeJointPose(pose)
      const collision = evaluatePose(normalized)
      applyPose(normalized)
      return collision
    },
    resolveJointMove(current, index, target) {
      const normalized = normalizeJointPose(current)
      const clampedTarget = Math.max(JOINTS[index]!.min, Math.min(JOINTS[index]!.max, target))
      const sweep = sweepToLimit(normalized, index, clampedTarget)
      const pose = [...normalized] as JointPose
      const direction = Math.sign(clampedTarget - normalized[index]!)
      const roundedSafeAngle = roundInsideSafeBoundary(sweep.angle, direction)
      pose[index] = direction > 0
        ? Math.max(normalized[index]!, roundedSafeAngle)
        : Math.min(normalized[index]!, roundedSafeAngle)
      applyPose(pose)
      return { pose, collision: sweep.collision }
    },
    getSafeJointRange(current, index) {
      const normalized = normalizeJointPose(current)
      const currentAngle = normalized[index]!
      const minimumSweep = sweepToLimit(normalized, index, JOINTS[index]!.min).angle
      const maximumSweep = sweepToLimit(normalized, index, JOINTS[index]!.max).angle
      // Keep dynamic bounds on the same 0.1° grid as the slider. Rounding is
      // always toward the current safe pose, never toward the collision.
      const min = Math.min(currentAngle, roundInsideSafeBoundary(minimumSweep, -1))
      const max = Math.max(currentAngle, roundInsideSafeBoundary(maximumSweep, 1))
      applyPose(normalized)
      return { min, max }
    },
  }), [applyPose, evaluatePose, sweepToLimit])

  useEffect(() => { onControllerReady?.() }, [onControllerReady])

  useEffect(() => {
    const pose = joints ? normalizeJointPose(joints) : undefined

    model.jointAxesHelpers.forEach((axes) => { axes.visible = showJointAxes })

    applyPose(pose ?? normalizeJointPose([]))

    // Place both inner pad surfaces around the measured center of the Hand
    // body. The source GLB clusters both finger nodes toward +Z, so preserving
    // their rest midpoint would make the gripper visibly off-center.
    ;([
      ['LeftFinger', 1],
      ['RightFinger', -1],
    ] as const).forEach(([node, direction]) => {
      const finger = model.scene.getObjectByName(node)
      const innerOffset = model.fingerInnerOffsets.get(node)
      if (!finger || innerOffset === undefined) return
      finger.position.z = gripperFingerPositionMeters(
        gripperWidthMm,
        model.gripperCenterMeters,
        innerOffset,
        direction,
      )
    })
    model.scene.updateMatrixWorld(true)
  }, [joints, gripperWidthMm, showJointAxes, model, applyPose])

  return <primitive object={model.scene as Object3D} />
})

useGLTF.preload(modelUrl)
