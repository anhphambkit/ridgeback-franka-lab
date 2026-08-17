import { Vector3 } from 'three'

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
