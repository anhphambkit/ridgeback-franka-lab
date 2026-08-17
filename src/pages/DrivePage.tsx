import { Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useRef, useState } from 'react'
import type { Group, Vector3Tuple } from 'three'
import { Metric } from '../components/Metric'
import { RobotModel } from '../components/RobotModel'
import { World } from '../components/World'
import { useKeyboardDrive } from '../hooks/useKeyboardDrive'
import { stepDrive, type DriveState } from '../lib/drive'

type RenderStats = {
  calls: number
  geometries: number
  triangles: number
  memory: string
  fps: number
  frameMs: number
}

const initialDrive: DriveState = {
  x: 0,
  z: 0,
  yaw: 0,
  linear: 0,
  angular: 0,
  leftWheel: 0,
  rightWheel: 0,
}

const initialStats: RenderStats = {
  calls: 0,
  geometries: 0,
  triangles: 0,
  memory: 'N/A',
  fps: 0,
  frameMs: 0,
}

function memoryUsed() {
  const value = performance as Performance & {
    memory?: { usedJSHeapSize: number }
  }
  return value.memory
    ? `${(value.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`
    : 'N/A'
}

function DriveSimulation({
  resetToken,
  onTelemetry,
  onStats,
}: {
  resetToken: number
  onTelemetry: (state: DriveState) => void
  onStats: (stats: RenderStats) => void
}) {
  const robot = useRef<Group>(null)
  const keys = useKeyboardDrive()
  const state = useRef<DriveState>({ ...initialDrive })
  const points = useRef<Vector3Tuple[]>([[0, 0.035, 0]])
  const [trail, setTrail] = useState<Vector3Tuple[]>(
    () => [[0, 0.035, 0]],
  )
  const lastTrail = useRef(0)
  const elapsedTime = useRef(0)
  const lastUi = useRef(0)
  const previousReset = useRef(resetToken)
  const smoothFrameMs = useRef(16.67)
  const { gl } = useThree()

  useFrame((_, delta) => {
    elapsedTime.current += delta
    smoothFrameMs.current =
      smoothFrameMs.current * 0.9 + delta * 1000 * 0.1

    if (previousReset.current !== resetToken) {
      previousReset.current = resetToken
      state.current = { ...initialDrive }
      points.current = [[0, 0.035, 0]]
      setTrail([...points.current])
    }

    const pressed = keys.current
    state.current = stepDrive(
      state.current,
      {
        throttle:
          Number(pressed.has('ArrowUp'))
          - Number(pressed.has('ArrowDown')),
        steering:
          Number(pressed.has('ArrowLeft'))
          - Number(pressed.has('ArrowRight')),
      },
      delta,
    )

    const current = state.current
    if (robot.current) {
      robot.current.position.set(current.x, 0, current.z)
      robot.current.rotation.y = current.yaw
    }

    const elapsed = elapsedTime.current
    const lastPoint = points.current.at(-1)!
    const distance = Math.hypot(
      current.x - lastPoint[0],
      current.z - lastPoint[2],
    )

    if (elapsed - lastTrail.current > 0.08 && distance > 0.025) {
      points.current = [
        ...points.current.slice(-1499),
        [current.x, 0.035, current.z],
      ]
      setTrail(points.current)
      lastTrail.current = elapsed
    }

    if (elapsed - lastUi.current > 0.1) {
      onTelemetry({ ...current })
      onStats({
        calls: gl.info.render.calls,
        geometries: gl.info.memory.geometries,
        triangles: gl.info.render.triangles,
        memory: memoryUsed(),
        fps: 1000 / smoothFrameMs.current,
        frameMs: smoothFrameMs.current,
      })
      lastUi.current = elapsed
    }
  })

  return (
    <>
      {trail.length > 1 && (
        <Line points={trail} color="#eeff8a" lineWidth={2.5} />
      )}
      <group ref={robot}>
        <RobotModel />
      </group>
    </>
  )
}

export function DrivePage() {
  const [resetToken, setResetToken] = useState(0)
  const [telemetry, setTelemetry] = useState<DriveState>(initialDrive)
  const [stats, setStats] = useState<RenderStats>(initialStats)
  const updateTelemetry = useCallback((value: DriveState) => {
    setTelemetry(value)
  }, [])
  const updateStats = useCallback((value: RenderStats) => {
    setStats(value)
  }, [])

  return (
    <section
      style={{
        height: 'calc(100vh - 64px)',
        position: 'relative',
      }}
    >
      <button
        style={{ position: 'absolute', zIndex: 2, top: 16, left: 16 }}
        onClick={() => setResetToken((value) => value + 1)}
      >
        Reset simulation
      </button>

      <Canvas camera={{ position: [5, 4.2, -6], fov: 42 }}>
        <Suspense fallback={null}>
          <World>
            <DriveSimulation
              resetToken={resetToken}
              onTelemetry={updateTelemetry}
              onStats={updateStats}
            />
          </World>
        </Suspense>
      </Canvas>

      <aside className="renderer-panel" aria-label="Renderer statistics">
        <h2>Renderer <small>live</small></h2>
        <dl>
          <div><dt>FPS</dt><dd>{stats.fps.toFixed(0)}</dd></div>
          <div><dt>Frame time</dt><dd>{stats.frameMs.toFixed(1)} ms</dd></div>
          <div><dt>Draw calls</dt><dd>{stats.calls}</dd></div>
          <div><dt>Geometries</dt><dd>{stats.geometries}</dd></div>
          <div><dt>Triangles</dt><dd>{stats.triangles.toLocaleString()}</dd></div>
          <div><dt>JS memory</dt><dd>{stats.memory}</dd></div>
        </dl>
      </aside>

      <aside className="telemetry-panel" aria-label="Robot telemetry">
        <h2>Telemetry <small>10 Hz</small></h2>
        <div className="metric-grid">
          <Metric label="Position X" value={telemetry.x.toFixed(2)} unit="m" />
          <Metric label="Position Z" value={telemetry.z.toFixed(2)} unit="m" />
          <Metric
            label="Heading"
            value={(telemetry.yaw * 180 / Math.PI).toFixed(1)}
            unit="deg"
          />
          <Metric label="Linear" value={telemetry.linear.toFixed(2)} unit="m/s" />
          <Metric label="Angular" value={telemetry.angular.toFixed(2)} unit="rad/s" />
          <Metric label="Left wheel" value={telemetry.leftWheel.toFixed(2)} unit="rad/s" />
          <Metric label="Right wheel" value={telemetry.rightWheel.toFixed(2)} unit="rad/s" />
        </div>
      </aside>
    </section>
  )
}
