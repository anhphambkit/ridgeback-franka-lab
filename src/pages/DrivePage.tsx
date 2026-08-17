import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { RobotModel } from "../components/RobotModel";
import { World } from "../components/World";
import { useKeyboardDrive } from "../hooks/useKeyboardDrive";
import { stepDrive, type DriveState } from "../lib/drive";


const initialDrive: DriveState = {
    x: 0, z: 0, yaw: 0, linear: 0, angular: 0, leftWheel: 0, rightWheel: 0
}

function DriveSimulation() {
    const robot = useRef<Group>(null)
    const keys = useKeyboardDrive()
    const state = useRef<DriveState>({ ...initialDrive })

    useFrame((_, delta) => {
        const pressed = keys.current
        state.current = stepDrive(state.current, {
            throttle: Number(pressed.has('ArrowUp')) - Number(pressed.has('ArrowDown')),
            steering: Number(pressed.has('ArrowLeft')) - Number(pressed.has('ArrowRight')),
        }, delta)
        if (robot.current) {
            robot.current.position.set(state.current.x, 0, state.current.z)
            robot.current.rotation.y = state.current.yaw
        }
    })

    return <group ref={robot}><RobotModel /></group>
}

export function DrivePage() {
    return (
        <section style={{ height: 'calc(100vh - 64px)' }}>
            <Canvas camera={{ position: [5, 4.2, -6], fov: 42 }}>
                <Suspense fallback={null}>
                    <World>
                        <DriveSimulation />
                    </World>
                </Suspense>
            </Canvas>
        </section>
    )
}