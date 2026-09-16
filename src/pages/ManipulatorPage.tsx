import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { RobotModel } from '../components/RobotModel'
import { SceneBoundary } from '../components/SceneBoundary'
import { DEMO_POSE, HOME_POSE, JOINTS, normalizeJointPose, type JointPose } from '../config/joints'
import { World } from '../components/World'

const formatAngle = (value: number) => value.toFixed(1)

function ManipulatorScene({ joints, showJointAxes }: { joints: JointPose, showJointAxes: boolean }) {
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
    <RobotModel joints={joints} showJointAxes={showJointAxes} />
    <Html position={[0, 1.6, 0]} center distanceFactor={8} className="model-tag">6-DOF CHAIN · TCP {tip.map((v) => v.toFixed(2)).join(' / ')}</Html>
  </group>
}

export function ManipulatorPage() {
  const [joints, setJoints] = useState<JointPose>(() => [...HOME_POSE])
  const [showJointAxes, setShowJointAxes] = useState(true)
  const updateJoint = (index: number, value: number) => setJoints((current) => {
    const next = [...current]
    next[index] = value
    return normalizeJointPose(next)
  })

  return <section className="page-layout manipulator-layout">
    <aside className="side-panel joint-panel">
      <p className="eyebrow">Forward kinematics</p>
      <h1>Six axes.<br /><em>One chain.</em></h1>
      <p className="lede">Adjust each local joint rotation. Child links inherit every upstream transform in the GLB hierarchy.</p>
      <label className="camera-toggle axes-toggle">
        <input type="checkbox" checked={showJointAxes} onChange={(event) => setShowJointAxes(event.target.checked)} />
        Joint axes <small>X red · Y green · Z blue</small>
      </label>
      <div className="joint-list">
        {JOINTS.map((joint, index) => <label key={joint.node}>
          <span>{joint.label}<output>{formatAngle(joints[index]!)}°</output></span>
          <input type="range" min={joint.min} max={joint.max} step="0.1" value={joints[index]} onChange={(event) => updateJoint(index, Number(event.target.value))} />
          <small>{formatAngle(joint.min)}° <i /> {formatAngle(joint.max)}°</small>
        </label>)}
      </div>
      <div className="button-row">
        <button className="reset-button" onClick={() => setJoints([...HOME_POSE])}>Home pose</button>
        <button className="ghost-button" onClick={() => setJoints([...DEMO_POSE])}>Demo pose</button>
      </div>
    </aside>
    <div className="viewport-wrap">
      <SceneBoundary>
        <Canvas dpr={[1, 1.5]} camera={{ position: [3.4, 2.8, -4.2], fov: 38 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
          <Suspense fallback={<Html center className="scene-loader">Loading robot</Html>}><World><ManipulatorScene joints={joints} showJointAxes={showJointAxes} /></World></Suspense>
        </Canvas>
      </SceneBoundary>
      <div className="viewport-label">LIVE / ARM_FK</div>
      <div className="chain-panel glass-panel">
        <div className="panel-title"><span>Kinematic chain</span><i>GLB nodes</i></div>
        <p>Base → Link0 → <b>Link1 → Link2 → Link3 → Link4 → Link5 → Link6</b> → Link7 → Hand</p>
      </div>
    </div>
  </section>
}
