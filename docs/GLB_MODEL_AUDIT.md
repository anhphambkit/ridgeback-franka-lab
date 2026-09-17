# Ridgeback-Franka GLB model audit

This document records what is actually present in the supplied runtime asset,
`ridgeback_franka.optimized.glb`, and separates that data from robot parameters
that must come from an external kinematic specification.

## Executive summary

- The GLB preserves a usable parent-child chain from `Link0` through `Hand`.
- `Link0` through `Link7` are transform/pivot nodes. Their visible geometry is
  stored in separate unnamed child nodes.
- Three.js names those child meshes `Link0_1` through `Link7_1` at runtime to
  avoid colliding with the pivot names. Joint rotations must be applied to the
  pivot (`Link1`), not its visual mesh (`Link1_1`).
- The GLB does **not** contain joint type, axis, position limits, velocity
  limits, or other URDF-style joint metadata. Every node has empty `extras`.
- The limits in `src/config/joints.ts` are rounded degree conversions of the
  official Franka Emika Robot (FER/Panda) position limits.
- The configured X/Y axes are an adaptation to the supplied GLB's Y-up,
  baked coordinate system. They are not read from the GLB and should be
  described as derived values that require visual validation rather than
  embedded metadata.

## Asset inspected

| Property | Value |
| --- | --- |
| Runtime asset | `ridgeback_franka.optimized.glb` |
| glTF version | 2.0 |
| Scene | `Scene` |
| Root node | `Base` |
| Node count | 24 |
| Mesh count | 14 |
| Compression/extensions | `EXT_meshopt_compression`, `KHR_mesh_quantization` |
| Animations | None |
| Joint metadata in `extras` | None |

The indices below are zero-based positions in the GLB's top-level `nodes`
array. A value in a node's `children` array refers to another entry in that
same array. These file indices are useful for auditing, but application code
should use validated names and hierarchy rather than hard-coded indices because
indices can change when an asset is re-exported or optimized.

## Complete node hierarchy

```text
[13] Base (pivot/container)
├── [0]  FrontLaser (mesh: FrontLaser)
├── [11] Link0 (pivot/container)
│   ├── [10] Link1 (pivot for configured Joint 1)
│   │   ├── [9]  Link2 (pivot for configured Joint 2)
│   │   │   ├── [8]  Link3 (pivot for configured Joint 3)
│   │   │   │   ├── [7]  Link4 (pivot for configured Joint 4)
│   │   │   │   │   ├── [6]  Link5 (pivot for configured Joint 5)
│   │   │   │   │   │   ├── [5]  Link6 (pivot for configured Joint 6)
│   │   │   │   │   │   │   ├── [4]  Link7 (additional articulated pivot)
│   │   │   │   │   │   │   │   ├── [3]  Hand (container)
│   │   │   │   │   │   │   │   │   ├── [1]  LeftFinger (mesh)
│   │   │   │   │   │   │   │   │   ├── [2]  RightFinger (mesh)
│   │   │   │   │   │   │   │   │   └── [14] unnamed node → mesh Hand
│   │   │   │   │   │   │   │   └── [15] unnamed node → mesh Link7
│   │   │   │   │   │   │   └── [16] unnamed node → mesh Link6
│   │   │   │   │   │   └── [17] unnamed node → mesh Link5
│   │   │   │   │   └── [18] unnamed node → mesh Link4
│   │   │   │   └── [19] unnamed node → mesh Link3
│   │   │   └── [20] unnamed node → mesh Link2
│   │   └── [21] unnamed node → mesh Link1
│   └── [22] unnamed node → mesh Link0
├── [12] RearLaser (mesh: RearLaser)
└── [23] unnamed node → mesh Base
```

Three.js reconstructs `parent` and `children` from this GLB hierarchy. It also
derives names for unnamed mesh-bearing nodes from their mesh names. Because a
pivot named `Link1` already exists, the visual child is made unique as
`Link1_1`. The effective runtime hierarchy therefore contains pairs such as:

```text
Link1   [Object3D]  ← rotate this pivot
├── Link2 [Object3D]
└── Link1_1 [Mesh]  ← visual geometry only
```

Rotating `Link1` affects `Link1_1` and every descendant from `Link2` through
`Hand`. Rotating only `Link1_1` changes one visible mesh and does not propagate
the transform through the kinematic chain.

## Pivot transforms stored in the GLB

All articulated pivot nodes have identity rest rotation `[0, 0, 0, 1]`, unit
scale `[1, 1, 1]`, and empty `extras`. Their translations are local to their
parent:

| GLB index | Node | Parent | Local translation `[x, y, z]` | Rest quaternion |
| ---: | --- | --- | --- | --- |
| 11 | `Link0` | `Base` | `[0, 0, 0]` | `[0, 0, 0, 1]` |
| 10 | `Link1` | `Link0` | `[0.300006, 0.420999, -0.000015]` | `[0, 0, 0, 1]` |
| 9 | `Link2` | `Link1` | `[0.000030, 0.192084, -0.000486]` | `[0, 0, 0, 1]` |
| 8 | `Link3` | `Link2` | `[0.000019, 0.193895, 0.000515]` | `[0, 0, 0, 1]` |
| 7 | `Link4` | `Link3` | `[0.079058, 0.125282, 0.000485]` | `[0, 0, 0, 1]` |
| 6 | `Link5` | `Link4` | `[-0.077758, 0.125127, -0.000485]` | `[0, 0, 0, 1]` |
| 5 | `Link6` | `Link5` | `[0.000011, 0.258996, -0.015814]` | `[0, 0, 0, 1]` |
| 4 | `Link7` | `Link6` | `[-0.088720, 0.052162, 0.017214]` | `[0, 0, 0, 1]` |
| 3 | `Hand` | `Link7` | `[0.000777, 0.052351, -0.000864]` | `[0, 0, 0, 1]` |

The translations establish pivots and link offsets, but they do not identify a
revolute axis or a safe angular range.

## Joint configuration and provenance

The application exposes all seven articulated pivots found in the arm chain.
This matches the physical Franka Panda/FER's seven revolute joints. The GLB
hierarchy identifies the pivots, while the axes and safe limits still come from
the external robot specification and model-specific frame validation.

| UI joint | Pivot node | Current GLB-local axis | Limit in code | Limit provenance | Axis provenance |
| --- | --- | --- | --- | --- | --- |
| Joint 1 | `Link1` | `+Y` `(0, 1, 0)` | `[-166.0°, 166.0°]` | FER/Panda J1, conservative 0.1° conversion | URDF axis accumulated through joint origins, then converted from Z-up to GLB Y-up |
| Joint 2 | `Link2` | `-Z` `(0, 0, -1)` | `[-101.0°, 101.0°]` | FER/Panda J2, conservative 0.1° conversion | Same frame conversion |
| Joint 3 | `Link3` | `+Y` `(0, 1, 0)` | `[-166.0°, 166.0°]` | FER/Panda J3, conservative 0.1° conversion | Same frame conversion |
| Joint 4 | `Link4` | `+Z` `(0, 0, 1)` | `[-176.0°, -4.0°]` | FER/Panda J4, conservative 0.1° conversion | Same frame conversion; visually validated as the elbow hinge |
| Joint 5 | `Link5` | `+Y` `(0, 1, 0)` | `[-166.0°, 166.0°]` | FER/Panda J5, conservative 0.1° conversion | Same frame conversion |
| Joint 6 | `Link6` | `+Z` `(0, 0, 1)` | `[-1.0°, 215.0°]` | FER/Panda J6, conservative 0.1° conversion | Same frame conversion |
| Joint 7 | `Link7` | `-Y` `(0, -1, 0)` | `[-166.0°, 166.0°]` | FER/Panda J7, conservative 0.1° conversion | Same frame conversion |

### Gripper configuration

`LeftFinger` and `RightFinger` are direct children of `Hand`. In the optimized
runtime GLB their rest translations are separated along the Hand-local Z axis.
The supplied finger meshes have nearly identical geometry and the same rest
orientation, so the application rotates `LeftFinger` 180° around its long
Hand-local Y axis to make the textured pads oppose each other. Their source
translations are also clustered toward positive Hand-local Z rather than
centered on the Hand body.

At load time the application measures the Hand body and both finger meshes in
Hand-local coordinates. It centers the two inner pad surfaces on the Hand's Z
midpoint and moves them symmetrically to produce the commanded geometric gap.
The Hand is about 204 mm wide and each finger is about 26 mm thick in this
asset, leaving roughly 151 mm between the frame edges; the UI uses a rounded
`0–150 mm` visual range. This differs from the physical Franka gripper's 80 mm
specification and is intentionally calibrated to the supplied demo model.
These nodes are meshes rather than URDF-style prismatic joint records, so the
orientation, center, and travel must be revalidated if the model is replaced.

### Position-limit source

The authoritative numeric source is Franka Robotics' **Control Interface
Specification and Robot Limits**, section "Limits for Franka Emika Robot
(FER)":

- <https://frankarobotics.github.io/docs/robot_specifications.html>

The code uses degrees for human-readable sliders, while the official values are
in radians:

| Joint | Official minimum (rad) | Official maximum (rad) | Converted and rounded (deg) |
| --- | ---: | ---: | ---: |
| J1 | -2.8973 | 2.8973 | `[-166, 166]` |
| J2 | -1.7628 | 1.7628 | `[-101, 101]` |
| J3 | -2.8973 | 2.8973 | `[-166, 166]` |
| J4 | -3.0718 | -0.0698 | `[-176, -4]` |
| J5 | -2.8973 | 2.8973 | `[-166, 166]` |
| J6 | -0.0175 | 3.7525 | `[-1, 215]` |
| J7 | -2.8973 | 2.8973 | `[-166, 166]` |

Conversion formula:

```text
degrees = radians × 180 / π
```

For example, Joint 1 is approximately:

```text
2.8973 × 180 / π = 166.00°
```

The limit is not `[-180°, 180°]` because the real joint has mechanical and
safety constraints and does not provide a full 360-degree range.

### Pose-dependent visual collision limits

The manufacturer limits above remain the outer mechanical envelope. The
Manipulator page additionally computes a narrower range for every slider from
the complete current seven-joint pose. This is dynamic: changing Joint 4 can
change the displayed safe range for Joint 5, and changing Joint 5 can change
the ranges of other joints. There is no hand-authored table of Joint 4 angle
bands or dependent Joint 5 limits.

At runtime the application:

1. Builds an oriented bounding box (OBB) from the chassis, both laser housings,
   each visible arm link, hand, and finger mesh.
2. Sweeps one candidate joint from its current angle toward each mechanical
   limit in 1° increments while retaining all other joint angles.
3. Updates the complete GLB hierarchy and transforms each local OBB into world
   space at every candidate angle.
4. Stops at the first intersection between non-neighboring robot parts.
5. Refines the last safe boundary with six binary-search iterations, then
   rounds inward to the slider's 0.1° grid.

Adjacent link housings overlap at their designed joints, so collision checks
ignore chain members up to two hierarchy steps apart. The two fingers are also
ignored against each other, `Hand`, and `Link7`, because those pairs touch or
overlap in the supplied visual geometry by design. Other link pairs are tested
automatically.

`Base` and `Hand` require explicit visual-mesh ownership matching. They each
contain several direct mesh children: `Base` also owns `FrontLaser` and
`RearLaser`, while `Hand` owns both fingers. Three.js names their actual body
meshes `Base_1` and `Hand_1`. Selecting the first direct mesh would therefore
use `FrontLaser` as the chassis collider and `LeftFinger` as the hand collider,
missing collisions with the real chassis/hand geometry. The resolver matches
the owning pivot name and fails closed when a multi-mesh pivot is ambiguous;
regression tests cover both structures.

These are **visual demo limits**, not safety-certified robot limits. Mesh OBBs
are intentionally lightweight approximations: they can stop early around
concave shapes and they do not represent the manufacturer's collision model,
payload, cables, environment, velocity, braking distance, or controller safety
configuration. Production limits and collision behavior must come from the
matching robot description/controller or a validated robotics simulator.

### Axis source and coordinate-system caveat

The official Franka description defines the revolute axes in URDF/Xacro:

- <https://github.com/frankarobotics/franka_ros/blob/develop/franka_description/robots/common/franka_arm.xacro>
- <https://github.com/frankarobotics/franka_description>

The Xacro commonly expresses each revolute axis as `(0, 0, 1)` in that joint's
own URDF frame. This does **not** mean every joint rotates about the same world
axis: each joint also has an `origin` rotation, and the URDF frame convention
differs from the supplied GLB's Y-up frame.

The supplied GLB has identity rest quaternions on its link pivots and has baked
the source-frame rotations into its geometry/layout. The configured axes are
therefore obtained by accumulating the official URDF joint-origin rotations,
then applying the asset's coordinate conversion `X_glb = X_urdf`,
`Y_glb = Z_urdf`, `Z_glb = -Y_urdf`. This produces the sequence
`+Y, -Z, +Y, +Z, +Y, +Z, -Y` for J1–J7. The page exposes an `AxesHelper` toggle
for visual verification: X is red, Y is green, and Z is blue.

## Reproducing the runtime audit

The following development-only code prints the effective Three.js hierarchy:

```tsx
function printHierarchy(object: Object3D, depth = 0) {
  const indent = '  '.repeat(depth)
  console.log(`${indent}${object.name || '(unnamed)'} [${object.type}]`)
  object.children.forEach((child) => printHierarchy(child, depth + 1))
}

printHierarchy(gltf.scene)
```

To inspect only the articulated pivots and their immediate relationships:

```tsx
gltf.scene.traverse((object) => {
  const isLinkPivot = !('isMesh' in object && object.isMesh)
    && /^Link\d+$/.test(object.name)

  if (!isLinkPivot) return

  console.log({
    name: object.name,
    parent: object.parent?.name,
    children: object.children.map((child) => child.name),
    position: object.position.toArray(),
    quaternion: object.quaternion.toArray(),
    userData: object.userData,
  })
})
```

Use an `AxesHelper` for visual axis validation:

```tsx
const joint = gltf.scene.getObjectByName('Link1')
joint?.add(new AxesHelper(0.15))
```

Three.js colors the axes red (X), green (Y), and blue (Z). Rotate one candidate
axis at a time and confirm that the link rotates around the expected physical
pivot and that all downstream links inherit the motion.

## Validation checklist for replacement assets

Before changing joint configuration or replacing the GLB:

1. Print and record the complete scene hierarchy.
2. Confirm that each configured name resolves to a pivot/container, not a mesh.
3. Confirm the direct chain `Link1 → Link2 → ... → Hand`.
4. Record local translation, rest quaternion, scale, and `userData` for pivots.
5. Display local X/Y/Z axes with `AxesHelper`.
6. Obtain authoritative joint axes and limits from URDF or manufacturer data.
7. Convert those axes into the GLB node-local coordinate frames.
8. Rotate each joint independently and verify downstream inheritance.
9. Verify the TCP/`Hand` world position after representative poses.
10. Re-run this audit after any export or optimization, because names, indices,
    pivots, or hierarchy may change.
