import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import modelUrl from '../../ridgeback_franka.glb?url'

export const JOINTS = [
  {
    node: 'Link1',
    label: 'Joint 1 · Base yaw',
    axis: new Vector3(0, 1, 0),
    min: -166,
    max: 166,
  },
  {
    node: 'Link2',
    label: 'Joint 2 · Shoulder',
    axis: new Vector3(1, 0, 0),
    min: -101,
    max: 101,
  },
  {
    node: 'Link3',
    label: 'Joint 3 · Arm swivel',
    axis: new Vector3(0, 1, 0),
    min: -166,
    max: 166,
  },
  {
    node: 'Link4',
    label: 'Joint 4 · Elbow',
    axis: new Vector3(1, 0, 0),
    min: -176,
    max: -4,
  },
  {
    node: 'Link5',
    label: 'Joint 5 · Wrist swivel',
    axis: new Vector3(0, 1, 0),
    min: -166,
    max: 166,
  },
  {
    node: 'Link6',
    label: 'Joint 6 · Wrist bend',
    axis: new Vector3(1, 0, 0),
    min: -1,
    max: 215,
  },
] as const

type Props = { joints?: number[] }

export function RobotModel({ joints }: Props) {
  const gltf = useGLTF(modelUrl)
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene])
  const restQuaternions = useRef(new Map<string, Quaternion>())

  useEffect(() => {
    JOINTS.forEach(({ node }) => {
      const part = scene.getObjectByName(node)
      if (part && !restQuaternions.current.has(node)) {
        restQuaternions.current.set(node, part.quaternion.clone())
      }
    })
  }, [scene])

  useEffect(() => {
    if (!joints) return

    JOINTS.forEach(({ node, axis }, index) => {
      const part = scene.getObjectByName(node)
      const rest = restQuaternions.current.get(node)
      if (!part || !rest) return

      const angle = (joints[index] * Math.PI) / 180
      const jointRotation = new Quaternion().setFromAxisAngle(axis, angle)
      part.quaternion.copy(rest).multiply(jointRotation)
    })
  }, [joints, scene])

  return <primitive object={scene as Object3D} />
}

useGLTF.preload(modelUrl)
