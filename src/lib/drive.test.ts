import { describe, expect, it } from 'vitest'
import {
    DEFAULT_LIMITS, stepDrive,
    twistToWheelSpeeds, wheelSpeedsToTwist,
    approach
} from './drive'

const stopped = {
    x: 0, z: 0, yaw: 0, linear: 0, angular: 0,
    leftWheel: 0, rightWheel: 0,
}

describe('differential drive', () => {
    it('uses opposite wheel speeds for an in-place turn', () => {
        const wheels = twistToWheelSpeeds(0, 1)
        expect(wheels.left).toBeCloseTo(-wheels.right)
    })

    it('clamps input and respects velocity limits', () => {
        const next = stepDrive(
            stopped, { throttle: 99, steering: -99 }, 0.1,
        )
        expect(Math.abs(next.linear))
            .toBeLessThanOrEqual(DEFAULT_LIMITS.maxLinear)
        expect(Math.abs(next.angular))
            .toBeLessThanOrEqual(DEFAULT_LIMITS.maxAngular)
    })

    it('round-trips wheel and base velocities', () => {
        const source = { linear: 0.8, angular: -0.45 }
        const result = wheelSpeedsToTwist(
            twistToWheelSpeeds(source.linear, source.angular),
        )
        expect(result.linear).toBeCloseTo(source.linear)
        expect(result.angular).toBeCloseTo(source.angular)
    })

    it('moves forward along local positive Z', () => {
        const next = stepDrive(
            stopped, { throttle: 1, steering: 0 }, 0.1,
        )
        expect(next.x).toBeCloseTo(0)
        expect(next.z).toBeGreaterThan(0)
    })

    it('ramps without exceeding target', () => {
        expect(approach(0, 1, 0.2)).toBe(0.2)
        expect(approach(0.95, 1, 0.2)).toBe(1)
    })

    it('ramps down after release', () => {
        const moving = {
            ...stopped, linear: 1, leftWheel: 1, rightWheel: 1,
        }
        const next = stepDrive(
            moving, { throttle: 0, steering: 0 }, 0.1,
        )
        expect(next.linear).toBeCloseTo(0.91)
    })
})