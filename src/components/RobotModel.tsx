import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { Object3D, Quaternion } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import modelUrl from '../../ridgeback_franka.optimized.glb?url'
import { JOINTS } from '../config/joints'

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
