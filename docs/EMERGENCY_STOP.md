# Emergency stop and head-on collision prevention

An emergency stop (E-stop) must be implemented as an independent safety path, not only as another keyboard command. The browser demo is not safety-rated software; a physical robot requires certified hardware, risk assessment, and validation under the applicable machinery and robot safety standards.

## Proposed architecture

1. Fuse redundant forward-facing sensors (safety lidar plus depth camera or bumper) into a local obstacle map.
2. Project the robot footprint along its current velocity and curvature over a short time horizon. Include localization uncertainty and a configurable safety margin.
3. Calculate stopping distance on every control cycle:

   `d_stop = v² / (2 × a_brake) + v × (sensor_latency + controller_latency) + margin`

4. Use two zones. Entering the warning zone limits commanded speed; entering the protective zone immediately latches the E-stop.
5. The safety controller overrides the motion command and commands zero wheel torque or the hardware-defined safe stop. The ordinary UI/controller cannot bypass this channel.

## State machine

`RUNNING → SPEED_LIMITED → ESTOP_LATCHED → MANUAL_RESET → RUNNING`

- A protective-zone violation, stale sensor heartbeat, controller fault, or physical E-stop button transitions to `ESTOP_LATCHED`.
- The latch remains active after the obstacle disappears.
- Reset requires a deliberate physical/manual acknowledgement after the area is confirmed clear. Resetting only arms the system; it must not resume the previous velocity command.

## Integration with this demo

Add an `EmergencyStopController` before `stepDrive`. It receives sensor observations and the current state, then returns either the operator input, a limited input, or `{ throttle: 0, steering: 0 }`. For a simulated E-stop, bypass the normal acceleration ramp when braking: approach zero using a separately configured emergency deceleration. Visualize warning/protective zones and expose the state and reason in telemetry.

## Verification

- Unit-test stopping-distance calculations, stale data, and latch/reset transitions.
- Scenario-test static obstacles, crossing obstacles, maximum speed, turns, sensor dropout, and low frame rates.
- Measure worst-case end-to-end latency and braking distance on the real surface at maximum payload.
- Fail safe: invalid, late, or contradictory safety data must stop the platform.
