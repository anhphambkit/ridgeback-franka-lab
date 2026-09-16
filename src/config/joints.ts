import { MathUtils, Vector3 } from 'three'

export type JointPose = [number, number, number, number, number, number]

// Keep slider values on a clean 0.1° grid while staying inside the official
// radian limits (ceil lower bounds, floor upper bounds).
const lowerDegrees = (radians: number) => Math.ceil(MathUtils.radToDeg(radians) * 10) / 10
const upperDegrees = (radians: number) => Math.floor(MathUtils.radToDeg(radians) * 10) / 10

export const JOINTS = [
  {
    node: 'Link1',
    label: 'Joint 1 · Base yaw',
    axis: new Vector3(0, 1, 0),
    min: lowerDegrees(-2.8973),
    max: upperDegrees(2.8973),
  },
  {
    node: 'Link2',
    label: 'Joint 2 · Shoulder',
    axis: new Vector3(0, 0, -1),
    min: lowerDegrees(-1.7628),
    max: upperDegrees(1.7628),
  },
  {
    node: 'Link3',
    label: 'Joint 3 · Arm swivel',
    axis: new Vector3(0, 1, 0),
    min: lowerDegrees(-2.8973),
    max: upperDegrees(2.8973),
  },
  {
    node: 'Link4',
    label: 'Joint 4 · Elbow',
    axis: new Vector3(0, 0, 1),
    min: lowerDegrees(-3.0718),
    max: upperDegrees(-0.0698),
  },
  {
    node: 'Link5',
    label: 'Joint 5 · Wrist swivel',
    axis: new Vector3(0, 1, 0),
    min: lowerDegrees(-2.8973),
    max: upperDegrees(2.8973),
  },
  {
    node: 'Link6',
    label: 'Joint 6 · Wrist bend',
    axis: new Vector3(0, 0, 1),
    min: lowerDegrees(-0.0175),
    max: upperDegrees(3.7525),
  },
] as const

export const HOME_POSE: JointPose = [0, 0, 0, -45, 0, 90]
export const DEMO_POSE: JointPose = [35, -40, 60, -110, 45, 120]

export function normalizeJointPose(pose: readonly number[]): JointPose {
  return JOINTS.map((joint, index) => {
    const value = pose[index]
    const fallback = HOME_POSE[index]!
    return MathUtils.clamp(
      typeof value === 'number' && Number.isFinite(value) ? value : fallback,
      joint.min,
      joint.max,
    )
  }) as JointPose
}
