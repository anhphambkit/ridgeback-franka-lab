# Instancing the Ridgeback–Franka model

## Why use instancing

`THREE.InstancedMesh` stores one geometry and one material, then draws many transforms in one call. A fleet of identical robots can therefore reduce draw calls and CPU-to-GPU state changes significantly. Geometry is shared, and per-instance transforms/colors are compact, so GPU memory and JavaScript object overhead can also fall.

Instancing is most useful when tens or hundreds of robots share the same meshes and materials. It provides little benefit for the single robot shown in this demo.

## Main technical challenge

The GLB is not one rigid mesh. It contains 14 meshes arranged as a kinematic hierarchy: each manipulator link moves relative to its parent. Instancing the entire scene with one matrix per robot would make every link rigid, breaking forward kinematics. Skinned-mesh instancing is also not available as a transparent drop-in solution in Three.js.

## Practical solution: one instanced batch per link

1. Load the GLB once and extract each mesh's geometry and material.
2. Create one `InstancedMesh` for `Base`, one for `Link0`, one for `Link1`, and so on. Each batch has capacity equal to the fleet size.
3. For every robot, compute forward kinematics on the CPU. Starting from its world/base matrix, multiply each link's rest transform and joint rotation down the chain.
4. Write the resulting world matrix for link *L* of robot *i* into the corresponding link batch with `setMatrixAt(i, matrix)`.
5. Mark `instanceMatrix.needsUpdate = true` only for batches whose poses changed. Use `DynamicDrawUsage` for frequently moving fleets.
6. Handle per-robot selection/state with `setColorAt`, an instanced attribute, or a custom shader. Raycasting returns `instanceId`, which maps back to the robot record.

This changes roughly `robotCount × meshCount` draw calls into approximately `meshCount × materialVariants` draw calls while retaining independent joint poses.

## Drawbacks and limits

- CPU forward-kinematics and matrix-upload cost still scales with robot and link count.
- All instances in a batch must share geometry/material and usually render state.
- Individual visibility, shadows, animation state, and selection need bookkeeping or shader attributes.
- Frustum culling occurs at batch level by default; a large spread-out fleet can render off-screen instances. Spatially partition batches or implement GPU/CPU culling.
- Transparent materials and per-instance material variation complicate batching.
- The code is less declarative than cloned scene graphs and is not worthwhile for small counts.

For very large fleets, move FK into a vertex shader or GPU texture and combine it with spatial batching, but prefer the per-link CPU approach first because it is easier to test and integrates with standard Three.js materials.
