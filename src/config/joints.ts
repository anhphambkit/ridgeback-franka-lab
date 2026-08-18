import { MathUtils, Vector3 } from 'three'

export type JointPose = [number, number, number, number, number, number]

export const JOINTS = [
  {
    node: 'Link1',
    label: 'Joint 1 · Base yaw',
    axis: new Vector3(0, 1, 0),
    min: -166,
    max: 166,
  },
  {
    node: 'Link2',
    label: 'Joint 2 · Shoulder',
    axis: new Vector3(1, 0, 0),
    min: -101,
    max: 101,
  },
  {
    node: 'Link3',
    label: 'Joint 3 · Arm swivel',
    axis: new Vector3(0, 1, 0),
    min: -166,
    max: 166,
  },
  {
    node: 'Link4',
    label: 'Joint 4 · Elbow',
    axis: new Vector3(1, 0, 0),
    min: -176,
    max: -4,
  },
  {
    node: 'Link5',
    label: 'Joint 5 · Wrist swivel',
    axis: new Vector3(0, 1, 0),
    min: -166,
    max: 166,
  },
  {
    node: 'Link6',
    label: 'Joint 6 · Wrist bend',
    axis: new Vector3(1, 0, 0),
    min: -1,
    max: 215,
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
