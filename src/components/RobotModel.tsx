import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { AxesHelper, Object3D, Quaternion } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import modelUrl from '../../ridgeback_franka.optimized.glb?url'
import { JOINTS, normalizeJointPose, type JointPose } from '../config/joints'

type Props = { joints?: JointPose, showJointAxes?: boolean }

export function RobotModel({ joints, showJointAxes = false }: Props) {
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
    return { scene, restQuaternions, jointAxesHelpers }
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
  }, [joints, showJointAxes, model])

  return <primitive object={model.scene as Object3D} />
}

useGLTF.preload(modelUrl)
