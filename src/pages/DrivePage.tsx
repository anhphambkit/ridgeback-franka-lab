import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from '@react-three/drei'
import { Suspense, useRef, useState } from "react";
import type { Group, Vector3Tuple } from 'three'
import { RobotModel } from "../components/RobotModel";
import { World } from "../components/World";
import { useKeyboardDrive } from "../hooks/useKeyboardDrive";
import { stepDrive, type DriveState } from "../lib/drive";

const initialDrive: DriveState = {
    x: 0, z: 0, yaw: 0, linear: 0, angular: 0, leftWheel: 0, rightWheel: 0
}

function DriveSimulation({ resetToken }: { resetToken: number }) {
    const robot = useRef<Group>(null)
    const keys = useKeyboardDrive()
    const state = useRef<DriveState>({ ...initialDrive })
    const points = useRef<Vector3Tuple[]>([[0, 0.035, 0]])
    const [trail, setTrail] = useState<Vector3Tuple[]>(
        () => [[0, 0.035, 0]],
    )
    const lastTrail = useRef(0)
    const elapsedTime = useRef(0)
    const previousReset = useRef(resetToken)

    useFrame((_, delta) => {
        elapsedTime.current += delta
        if (previousReset.current !== resetToken) {
            previousReset.current = resetToken
            state.current = { ...initialDrive }
            points.current = [[0, 0.035, 0]]
            setTrail([...points.current])
        }
        const pressed = keys.current
        state.current = stepDrive(state.current, {
            throttle: Number(pressed.has('ArrowUp')) - Number(pressed.has('ArrowDown')),
            steering: Number(pressed.has('ArrowLeft')) - Number(pressed.has('ArrowRight')),
        }, delta)
        if (robot.current) {
            robot.current.position.set(state.current.x, 0, state.current.z)
            robot.current.rotation.y = state.current.yaw
        }

        const current = state.current
        const elapsed = elapsedTime.current
        const lastPoint = points.current.at(-1)!
        const distance = Math.hypot(current.x - lastPoint[0], current.z - lastPoint[2])
        if (elapsed - lastTrail.current > 0.08 && distance > 0.025) {
            points.current = [
                ...points.current.slice(-1499),
                [current.x, 0.035, current.z]
            ]
            setTrail(points.current)
            lastTrail.current = elapsed
        }
    })

    return (
        <>
            {
                trail.length > 1 && (
                    <Line points={trail} color="#eeff8a" lineWidth={2.5} />
                )
            }
            <group ref={robot}><RobotModel /></group>
        </>
    )
}

export function DrivePage() {
    const [resetToken, setResetToken] = useState(0)
    return (
        <section style={{ height: 'calc(100vh - 64px)' }}>
            <button
                style={{ position: 'absolute', zIndex: 1, top: 16, left: 16 }}
                onClick={() => setResetToken((value) => value + 1)}
            >
                Reset simulation
            </button>
            <Canvas camera={{ position: [5, 4.2, -6], fov: 42 }}>
                <Suspense fallback={null}>
                    <World>
                        <DriveSimulation resetToken={resetToken} />
                    </World>
                </Suspense>
            </Canvas>
        </section>
    )
}