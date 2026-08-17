export type DriveState = {
    x: number; z: number; yaw: number
    linear: number; angular: number
    leftWheel: number; rightWheel: number
}

export type DriveInput = { throttle: number; steering: number }
export type WheelSpeeds = { left: number; right: number }

export const DEFAULT_LIMITS = {
    maxLinear: 1.5, maxAngular: 1.25,
    linearAcceleration: 0.9, angularAcceleration: 1.8,
    wheelRadius: 0.13, axleTrack: 0.58,
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

export function twistToWheelSpeeds(
    linear: number,
    angular: number,
    limits = DEFAULT_LIMITS
): WheelSpeeds {
    const halfTrack = limits.axleTrack / 2
    return {
        left: (linear - angular * halfTrack) / limits.wheelRadius,
        right: (linear + angular * halfTrack) / limits.wheelRadius,
    }
}

export function wheelSpeedsToTwist(
    wheels: WheelSpeeds,
    limits = DEFAULT_LIMITS
) {
    return {
        linear: limits.wheelRadius * (wheels.right + wheels.left) / 2,
        angular: limits.wheelRadius * (wheels.right - wheels.left) / limits.axleTrack
    }
}

export function stepDrive(
    state: DriveState,
    input: DriveInput,
    dt: number,
    limits = DEFAULT_LIMITS
): DriveState {
    const safeDt = Math.min(Math.max(dt, 0), 0.1)
    const throttle = clamp(input.throttle, -1, 1)
    const steering = clamp(input.steering, -1, 1)
    const targetLinear = throttle * limits.maxLinear
    const targetAngular = steering * limits.maxAngular
    const rampedLinear = approach(state.linear, targetLinear, limits.linearAcceleration * safeDt)
    const rampedAngular = approach(state.angular, targetAngular, limits.angularAcceleration * safeDt)
    const wheels = twistToWheelSpeeds(rampedLinear, rampedAngular, limits)
    const { linear, angular } = wheelSpeedsToTwist(wheels, limits)
    const yaw = state.yaw + angular * safeDt
    return {
        x: state.x + Math.sin(yaw) * linear * safeDt,
        z: state.z + Math.cos(yaw) * linear * safeDt,
        yaw, linear, angular,
        leftWheel: wheels.left, rightWheel: wheels.right
    }
}

export function approach(current: number, target: number, maxDelta: number) {
    if (current < target) return Math.min(current + maxDelta, target)
    if (current > target) return Math.max(current - maxDelta, target)
    return current
}