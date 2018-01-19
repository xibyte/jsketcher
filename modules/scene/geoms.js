
export function createBoxGeometry(width, height, depth) {
  return new THREE.BoxGeometry(width, height, depth);
}

export function createMeshGeometry(triangles) {
  const geometry = new THREE.Geometry();

  for (let tr of triangles) {
    const a = geometry.vertices.length;
    const b = a + 1;
    const c = a + 2;
    const face = new THREE.Face3(a, b, c);
    tr.forEach(v => geometry.vertices.push(v.three()));
    geometry.faces.push(face);
  }
  geometry.mergeVertices();
  geometry.computeFaceNormals();
  return geometry;
}