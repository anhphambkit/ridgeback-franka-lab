import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from '@react-three/drei'
import { Suspense, useCallback, useRef, useState } from "react";
import type { Group, Vector3Tuple } from 'three'
import { RobotModel } from "../components/RobotModel";
import { World } from "../components/World";
import { useKeyboardDrive } from "../hooks/useKeyboardDrive";
import { stepDrive, type DriveState } from "../lib/drive";
import { Metric } from '../components/Metric'

const initialDrive: DriveState = {
    x: 0, z: 0, yaw: 0, linear: 0, angular: 0, leftWheel: 0, rightWheel: 0
}

function DriveSimulation({ resetToken, onTelemetry }: { resetToken: number, onTelemetry: (state: DriveState) => void }) {
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
    const lastUi = useRef(0)

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

        if (elapsed - lastUi.current > 0.1) {
            onTelemetry({ ...current })
            lastUi.current = elapsed
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
    const [telemetry, setTelemetry] = useState<DriveState>(initialDrive)
    const updateTelemetry = useCallback((value: DriveState) => {
        setTelemetry(value)
    }, [])
    return (
        <section style={{ height: 'calc(100vh - 64px)', position: 'relative', }}>
            <button
                style={{ position: 'absolute', zIndex: 1, top: 16, left: 16 }}
                onClick={() => setResetToken((value) => value + 1)}
            >
                Reset simulation
            </button>
            <Canvas camera={{ position: [5, 4.2, -6], fov: 42 }}>
                <Suspense fallback={null}>
                    <World>
                        <DriveSimulation resetToken={resetToken} onTelemetry={updateTelemetry} />
                    </World>
                </Suspense>
            </Canvas>
            <aside className="telemetry-panel" aria-label="Robot telemetry">
                <h2>Telemetry <small>10 Hz</small></h2>
                <div className="metric-grid">
                    <Metric
                        label="Position X"
                        value={telemetry.x.toFixed(2)}
                        unit="m"
                    />
                    <Metric
                        label="Position Z"
                        value={telemetry.z.toFixed(2)}
                        unit="m"
                    />
                    <Metric
                        label="Heading"
                        value={(telemetry.yaw * 180 / Math.PI).toFixed(1)}
                        unit="deg"
                    />
                    <Metric
                        label="Linear"
                        value={telemetry.linear.toFixed(2)}
                        unit="m/s"
                    />
                    <Metric
                        label="Angular"
                        value={telemetry.angular.toFixed(2)}
                        unit="rad/s"
                    />
                    <Metric
                        label="Left wheel"
                        value={telemetry.leftWheel.toFixed(2)}
                        unit="rad/s"
                    />
                    <Metric
                        label="Right wheel"
                        value={telemetry.rightWheel.toFixed(2)}
                        unit="rad/s"
                    />
                </div>
            </aside>
        </section>
    )
}