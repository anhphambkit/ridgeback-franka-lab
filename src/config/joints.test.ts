import { describe, expect, it } from 'vitest'
import { HOME_POSE, JOINTS, normalizeJointPose } from './joints'

describe('joint configuration', () => {
  it('defines six unique articulated nodes with normalized axes', () => {
    expect(JOINTS).toHaveLength(6)
    expect(new Set(JOINTS.map((joint) => joint.node)).size).toBe(6)
    JOINTS.forEach((joint) => expect(joint.axis.length()).toBeCloseTo(1))
  })

  it('clamps every angle to its configured limits', () => {
    const input = [999, -999, 999, 999, -999, 999]
    const pose = normalizeJointPose(input)
    expect(pose).toEqual(JOINTS.map((joint, index) => input[index]! > 0 ? joint.max : joint.min))
  })

  it('replaces missing and non-finite values with the home pose', () => {
    expect(normalizeJointPose([Number.NaN])).toEqual(HOME_POSE)
  })
})
