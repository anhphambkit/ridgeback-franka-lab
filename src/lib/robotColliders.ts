import { Mesh, Object3D } from 'three'

const isMesh = (object: Object3D): object is Mesh => (object as Mesh).isMesh === true

/**
 * Resolve the geometry owned by a logical GLB pivot.
 *
 * GLTFLoader gives an unnamed mesh child a unique runtime name such as
 * `Base_1` when its mesh is named `Base` and the parent pivot already owns the
 * name `Base`. We deliberately match that name instead of taking the first
 * mesh child: Base also owns FrontLaser/RearLaser and Hand owns both fingers.
 */
export function findOwnedVisualMesh(object: Object3D): Mesh | undefined {
  if (isMesh(object)) return object

  const directMeshes = object.children.filter(isMesh)
  const ownedName = `${object.name}_`
  const ownedMeshes = directMeshes.filter((mesh) => (
    mesh.name === object.name || mesh.name.startsWith(ownedName)
  ))

  if (ownedMeshes.length === 1) return ownedMeshes[0]
  if (ownedMeshes.length > 1) return undefined
  return directMeshes.length === 1 ? directMeshes[0] : undefined
}
