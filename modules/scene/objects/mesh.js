import {createMeshGeometry} from '../geoms';

export function createMesh(geometry, material) {
  return new THREE.Mesh(geometry, material);
}

export function createMeshFromTriangles(triangles, material) {
  return createMesh(createMeshGeometry(triangles), material);
}
