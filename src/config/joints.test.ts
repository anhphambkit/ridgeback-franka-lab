import { describe, expect, it } from 'vitest'
import { GRIPPER, HOME_POSE, JOINTS, gripperFingerPositionMeters, normalizeGripperWidth, normalizeJointPose } from './joints'

describe('joint configuration', () => {
  it('defines seven unique articulated nodes with normalized axes', () => {
    expect(JOINTS).toHaveLength(7)
    expect(new Set(JOINTS.map((joint) => joint.node)).size).toBe(7)
    JOINTS.forEach((joint) => expect(joint.axis.length()).toBeCloseTo(1))
  })

  it('maps the URDF joint axes into the GLB Y-up frame', () => {
    expect(JOINTS.map((joint) => joint.axis.toArray())).toEqual([
      [0, 1, 0],
      [0, 0, -1],
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 0, 1],
      [0, -1, 0],
    ])
  })

  it('clamps every angle to its configured limits', () => {
    const input = [999, -999, 999, 999, -999, 999, -999]
    const pose = normalizeJointPose(input)
    expect(pose).toEqual(JOINTS.map((joint, index) => input[index]! > 0 ? joint.max : joint.min))
  })

  it('replaces missing and non-finite values with the home pose', () => {
    expect(normalizeJointPose([Number.NaN])).toEqual(HOME_POSE)
  })

  it('clamps gripper width to the model-calibrated range', () => {
    expect(normalizeGripperWidth(-1)).toBe(GRIPPER.minWidthMm)
    expect(normalizeGripperWidth(40)).toBe(40)
    expect(normalizeGripperWidth(999)).toBe(GRIPPER.maxWidthMm)
    expect(normalizeGripperWidth(Number.NaN)).toBe(GRIPPER.homeWidthMm)
  })

  it('places opposing inner surfaces symmetrically around the Hand center', () => {
    const center = -0.002
    const leftInnerOffset = -0.013
    const rightInnerOffset = 0.013
    const leftPosition = gripperFingerPositionMeters(150, center, leftInnerOffset, 1)
    const rightPosition = gripperFingerPositionMeters(150, center, rightInnerOffset, -1)

    expect(leftPosition + leftInnerOffset).toBeCloseTo(center + 0.075)
    expect(rightPosition + rightInnerOffset).toBeCloseTo(center - 0.075)
    expect((leftPosition + leftInnerOffset) - (rightPosition + rightInnerOffset)).toBeCloseTo(0.15)
  })
})
