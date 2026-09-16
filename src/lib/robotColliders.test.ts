import { BoxGeometry, Group, Mesh } from 'three'
import { describe, expect, it } from 'vitest'
import { findOwnedVisualMesh } from './robotColliders'

const mesh = (name: string) => {
  const value = new Mesh(new BoxGeometry(1, 1, 1))
  value.name = name
  return value
}

describe('findOwnedVisualMesh', () => {
  it('returns a mesh node directly', () => {
    const finger = mesh('LeftFinger')
    expect(findOwnedVisualMesh(finger)).toBe(finger)
  })

  it('selects the Base visual instead of the first sensor mesh', () => {
    const base = new Group()
    base.name = 'Base'
    const frontLaser = mesh('FrontLaser')
    const rearLaser = mesh('RearLaser')
    const baseVisual = mesh('Base_1')
    base.add(frontLaser, new Group(), rearLaser, baseVisual)
    expect(findOwnedVisualMesh(base)).toBe(baseVisual)
  })

  it('selects the Hand visual instead of either finger', () => {
    const hand = new Group()
    hand.name = 'Hand'
    const leftFinger = mesh('LeftFinger')
    const rightFinger = mesh('RightFinger')
    const handVisual = mesh('Hand_1')
    hand.add(leftFinger, rightFinger, handVisual)
    expect(findOwnedVisualMesh(hand)).toBe(handVisual)
  })

  it('fails closed when a multi-mesh pivot has no identifiable owner', () => {
    const pivot = new Group()
    pivot.name = 'Unknown'
    pivot.add(mesh('PartA'), mesh('PartB'))
    expect(findOwnedVisualMesh(pivot)).toBeUndefined()
  })
})
