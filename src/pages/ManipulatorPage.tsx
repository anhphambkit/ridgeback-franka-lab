import { Html } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Group, Vector3 } from 'three'
import { RobotModel, type CollisionHit, type RobotModelHandle, type SafeJointRange } from '../components/RobotModel'
import { SceneBoundary } from '../components/SceneBoundary'
import { DEMO_POSE, GRIPPER, HOME_POSE, JOINTS, normalizeGripperWidth, normalizeJointPose, type JointPose } from '../config/joints'
import { World } from '../components/World'

const formatAngle = (value: number) => value.toFixed(1)
const GRIPPER_COLLISION_DEBOUNCE_MS = 140

function ManipulatorScene({ joints, gripperWidthMm, showJointAxes, controllerRef, onControllerReady }: { joints: JointPose, gripperWidthMm: number, showJointAxes: boolean, controllerRef: RefObject<RobotModelHandle | null>, onControllerReady: () => void }) {
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
    <RobotModel ref={controllerRef} joints={joints} gripperWidthMm={gripperWidthMm} showJointAxes={showJointAxes} onControllerReady={onControllerReady} />
    <Html position={[0, 1.6, 0]} center distanceFactor={8} className="model-tag">7-DOF CHAIN · TCP {tip.map((v) => v.toFixed(2)).join(' / ')}</Html>
  </group>
}

export function ManipulatorPage() {
  const [joints, setJoints] = useState<JointPose>(() => [...HOME_POSE])
  const [gripperWidthMm, setGripperWidthMm] = useState<number>(GRIPPER.homeWidthMm)
  const [showJointAxes, setShowJointAxes] = useState(true)
  const [safeRanges, setSafeRanges] = useState<SafeJointRange[]>(() => JOINTS.map((joint) => ({ min: joint.min, max: joint.max })))
  const [collision, setCollision] = useState<CollisionHit | null>(null)
  const [controllerVersion, setControllerVersion] = useState(0)
  const controllerRef = useRef<RobotModelHandle>(null)
  const latestJointsRef = useRef(joints)
  const signature = joints.join(',')

  useEffect(() => { latestJointsRef.current = joints }, [joints])

  const handleControllerReady = useCallback(() => setControllerVersion((version) => version + 1), [])
  const refreshSafeRanges = useCallback((pose: JointPose) => {
    const controller = controllerRef.current
    if (!controller) return
    const poseCollision = controller.getPoseCollision(pose)
    if (poseCollision) setCollision(poseCollision)
    setSafeRanges(JOINTS.map((_, index) => controller.getSafeJointRange(pose, index)))
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => refreshSafeRanges(joints))
    return () => cancelAnimationFrame(frame)
  }, [signature, controllerVersion, joints, refreshSafeRanges])

  useEffect(() => {
    // Finger transforms remain synchronous with the slider in RobotModel. The
    // expensive seven-joint collision sweep waits until dragging pauses so it
    // cannot block pointer events and make the gripper appear to stutter.
    const timeout = window.setTimeout(
      () => refreshSafeRanges(latestJointsRef.current),
      GRIPPER_COLLISION_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [gripperWidthMm, refreshSafeRanges])

  const updateJoint = (index: number, value: number) => {
    const controller = controllerRef.current
    if (controller) {
      const result = controller.resolveJointMove(joints, index, value)
      setJoints(result.pose)
      setCollision(result.collision)
      return
    }
    const next = [...joints]
    next[index] = value
    setJoints(normalizeJointPose(next))
  }

  const applyPreset = (pose: JointPose, gripperWidth: number) => {
    const controller = controllerRef.current
    const presetCollision = controller?.getPoseCollision(pose) ?? null
    if (presetCollision) {
      // Collision checks temporarily apply the candidate transforms to measure
      // their OBBs, so restore the accepted pose when rejecting a preset.
      controller?.getPoseCollision(joints)
      setCollision(presetCollision)
      return
    }
    setJoints([...pose])
    setGripperWidthMm(gripperWidth)
    setCollision(null)
  }

  return <section className="page-layout manipulator-layout">
    <aside className="side-panel joint-panel">
      <p className="eyebrow">Forward kinematics</p>
      <h1>Seven axes.<br /><em>One chain.</em></h1>
      <p className="lede">Adjust each local joint rotation. Child links inherit every upstream transform in the GLB hierarchy.</p>
      <label className="camera-toggle axes-toggle">
        <input type="checkbox" checked={showJointAxes} onChange={(event) => setShowJointAxes(event.target.checked)} />
        Joint axes <small>X red · Y green · Z blue</small>
      </label>
      {collision && <p className="collision-warning" role="status">Collision limit · {collision.a} ↔ {collision.b}</p>}
      <div className="joint-list">
        {JOINTS.map((joint, index) => {
          const safeRange = safeRanges[index] ?? joint
          return <label key={joint.node}>
          <span>{joint.label}<output>{formatAngle(joints[index]!)}°</output></span>
          <input type="range" min={safeRange.min} max={safeRange.max} step="0.1" value={joints[index]} onChange={(event) => updateJoint(index, Number(event.target.value))} />
          <small>{formatAngle(safeRange.min)}° <i /> visual safe now <i /> {formatAngle(safeRange.max)}°</small>
        </label>})}
        <label>
          <span>Gripper · Opening<output>{gripperWidthMm} mm</output></span>
          <input type="range" min={GRIPPER.minWidthMm} max={GRIPPER.maxWidthMm} step="1" value={gripperWidthMm} onChange={(event) => setGripperWidthMm(normalizeGripperWidth(Number(event.target.value)))} />
          <small>{GRIPPER.minWidthMm} mm <i /> {GRIPPER.maxWidthMm} mm</small>
        </label>
      </div>
      <div className="button-row">
        <button className="reset-button" onClick={() => applyPreset(HOME_POSE, GRIPPER.homeWidthMm)}>Home pose</button>
        <button className="ghost-button" onClick={() => applyPreset(DEMO_POSE, 60)}>Demo pose</button>
      </div>
    </aside>
    <div className="viewport-wrap">
      <SceneBoundary>
        <Canvas dpr={[1, 1.5]} camera={{ position: [3.4, 2.8, -4.2], fov: 38 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
          <Suspense fallback={<Html center className="scene-loader">Loading robot</Html>}><World><ManipulatorScene joints={joints} gripperWidthMm={gripperWidthMm} showJointAxes={showJointAxes} controllerRef={controllerRef} onControllerReady={handleControllerReady} /></World></Suspense>
        </Canvas>
      </SceneBoundary>
      <div className="viewport-label">LIVE / ARM_FK</div>
      <div className="chain-panel glass-panel">
        <div className="panel-title"><span>Kinematic chain</span><i>GLB nodes</i></div>
        <p>Base → Link0 → <b>Link1 → Link2 → Link3 → Link4 → Link5 → Link6 → Link7</b> → Hand → Fingers</p>
      </div>
    </div>
  </section>
}
