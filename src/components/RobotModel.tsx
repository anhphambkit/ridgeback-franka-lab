import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { AxesHelper, Box3, Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import modelUrl from '../../ridgeback_franka.optimized.glb?url'
import { JOINTS, gripperFingerPositionMeters, normalizeJointPose, type JointPose } from '../config/joints'
import { findOwnedVisualMesh } from '../lib/robotColliders'

type Props = { joints?: JointPose, gripperWidthMm?: number, showJointAxes?: boolean }

const LEFT_FINGER_ORIENTATION_CORRECTION = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)

export function RobotModel({ joints, gripperWidthMm = 0, showJointAxes = false }: Props) {
  const gltf = useGLTF(modelUrl)
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
    const hand = scene.getObjectByName('Hand')
    if (!hand || !leftFinger || !rightFinger) throw new Error('Robot model is missing gripper nodes')

    leftFinger.quaternion.multiply(LEFT_FINGER_ORIENTATION_CORRECTION)
    scene.updateMatrixWorld(true)

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

    return { scene, restQuaternions, jointAxesHelpers, gripperCenterMeters, fingerInnerOffsets }
  }, [gltf.scene])

  useEffect(() => {
    const pose = joints ? normalizeJointPose(joints) : undefined

    model.jointAxesHelpers.forEach((axes) => { axes.visible = showJointAxes })

    JOINTS.forEach(({ node, axis }, index) => {
      const part = model.scene.getObjectByName(node)
      const rest = model.restQuaternions.get(node)
      if (!part || !rest) return

      const angle = ((pose?.[index] ?? 0) * Math.PI) / 180
      const jointRotation = new Quaternion().setFromAxisAngle(axis, angle)
      part.quaternion.copy(rest).multiply(jointRotation)
    })

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
  }, [joints, gripperWidthMm, showJointAxes, model])

  return <primitive object={model.scene as Object3D} />
}

useGLTF.preload(modelUrl)
