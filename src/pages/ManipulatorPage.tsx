import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { RobotModel } from '../components/RobotModel'
import { JOINTS } from '../config/joints'
import { World } from '../components/World'

const homePose = [0, 0, 0, -45, 0, 90]

function ManipulatorScene({ joints }: { joints: number[] }) {
  const robot = useRef<Group>(null)
  const [tip, setTip] = useState<[number, number, number]>([0, 0, 0])
  const signature = joints.join(',')

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const hand = robot.current?.getObjectByName('Hand')
      if (!hand) return
      const world = hand.getWorldPosition(new Vector3())
      setTip([world.x, world.y, world.z])
    })
    return () => cancelAnimationFrame(frame)
  }, [signature])

  return <group ref={robot}>
    <RobotModel joints={joints} />
    <Html position={[0, 1.6, 0]} center distanceFactor={8} className="model-tag">6-DOF CHAIN · TCP {tip.map((v) => v.toFixed(2)).join(' / ')}</Html>
  </group>
}

export function ManipulatorPage() {
  const [joints, setJoints] = useState(homePose)
  const updateJoint = (index: number, value: number) => setJoints((current) => current.map((angle, i) => i === index ? value : angle))

  return <section className="page-layout manipulator-layout">
    <aside className="side-panel joint-panel">
      <p className="eyebrow">Forward kinematics</p>
      <h1>Six axes.<br /><em>One chain.</em></h1>
      <p className="lede">Adjust each local joint rotation. Child links inherit every upstream transform in the GLB hierarchy.</p>
      <div className="joint-list">
        {JOINTS.map((joint, index) => <label key={joint.node}>
          <span>{joint.label}<output>{joints[index]}°</output></span>
          <input type="range" min={joint.min} max={joint.max} step="1" value={joints[index]} onChange={(event) => updateJoint(index, Number(event.target.value))} />
          <small>{joint.min}° <i /> {joint.max}°</small>
        </label>)}
      </div>
      <div className="button-row">
        <button className="reset-button" onClick={() => setJoints([...homePose])}>Home pose</button>
        <button className="ghost-button" onClick={() => setJoints([35, -40, 60, -110, 45, 120])}>Demo pose</button>
      </div>
    </aside>
    <div className="viewport-wrap">
      <Canvas dpr={[1, 1.5]} camera={{ position: [3.4, 2.8, -4.2], fov: 38 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><World><ManipulatorScene joints={joints} /></World></Suspense>
      </Canvas>
      <div className="viewport-label">LIVE / ARM_FK</div>
      <div className="chain-panel glass-panel">
        <div className="panel-title"><span>Kinematic chain</span><i>GLB nodes</i></div>
        <p>Base → Link0 → <b>Link1 → Link2 → Link3 → Link4 → Link5 → Link6</b> → Link7 → Hand</p>
      </div>
    </div>
  </section>
}
