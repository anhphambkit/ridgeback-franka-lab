import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { RobotModel } from '../components/RobotModel'
import { JOINTS } from '../config/joints'
import { World } from '../components/World'

const homePose = [0, 0, 0, -45, 0, 90]
const demoPose = [35, -40, 60, -110, 45, 120]

function ManipulatorScene({ joints }: { joints: number[] }) {
  const robot = useRef<Group>(null)
  const [tip, setTip] = useState<[number, number, number]>([0, 0, 0])
  const poseSignature = joints.join(',')

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const hand = robot.current?.getObjectByName('Hand')
      if (!hand) return

      const world = hand.getWorldPosition(new Vector3())
      setTip([world.x, world.y, world.z])
    })

    return () => cancelAnimationFrame(frame)
  }, [poseSignature])

  return (
    <group ref={robot}>
      <RobotModel joints={joints} />
      <Html position={[0, 1.6, 0]} center distanceFactor={8}>
        <div
          style={{
            whiteSpace: 'nowrap',
            padding: 6,
            color: '#d9ff68',
            background: '#07100e',
          }}
        >
          TCP {tip.map((value) => value.toFixed(2)).join(' / ')}
        </div>
      </Html>
    </group>
  )
}

export function ManipulatorPage() {
  const [joints, setJoints] = useState([...homePose])

  const updateJoint = (index: number, value: number) => {
    setJoints((current) =>
      current.map((angle, currentIndex) =>
        currentIndex === index ? value : angle,
      ),
    )
  }

  return (
    <section
      style={{
        height: 'calc(100vh - 64px)',
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
      }}
    >
      <aside style={{ padding: 20, overflowY: 'auto' }}>
        <h1>6-DOF forward kinematics</h1>

        {JOINTS.map((joint, index) => (
          <label key={joint.node} style={{ display: 'block', marginTop: 18 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              {joint.label}
              <output>{joints[index]}°</output>
            </span>
            <input
              type="range"
              min={joint.min}
              max={joint.max}
              step="1"
              value={joints[index]}
              style={{ width: '100%' }}
              onChange={(event) =>
                updateJoint(index, Number(event.target.value))
              }
            />
          </label>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button onClick={() => setJoints([...homePose])}>Home pose</button>
          <button onClick={() => setJoints([...demoPose])}>Demo pose</button>
        </div>
      </aside>

      <div style={{ minWidth: 0, minHeight: 0 }}>
        <Canvas camera={{ position: [3.4, 2.8, -4.2], fov: 38 }}>
          <Suspense fallback={null}>
            <World>
              <ManipulatorScene joints={joints} />
            </World>
          </Suspense>
        </Canvas>
      </div>
    </section>
  )
}
