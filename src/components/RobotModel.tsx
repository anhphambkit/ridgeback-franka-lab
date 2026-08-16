import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import modelUrl from '../../ridgeback_franka.glb?url'

export function RobotModel() {
    const gltf = useGLTF(modelUrl)
    const scene = useMemo(() => clone(gltf.scene), [gltf.scene])
    return <primitive object={scene} />
}

useGLTF.preload(modelUrl)