import {BoxGeometry, Face3, Geometry, Vector3} from 'three';

export function createBoxGeometry(width, height, depth) {
  return new BoxGeometry(width, height, depth);
}

export function createMeshGeometry(triangles) {
  const geometry = new Geometry();

  for (let tr of triangles) {
    const a = geometry.vertices.length;
    const b = a + 1;
    const c = a + 2;
    const face = new Face3(a, b, c);
    tr.forEach(v => geometry.vertices.push(v.three()));
    geometry.faces.push(face);
  }
  geometry.mergeVertices();
  geometry.computeFaceNormals();
  return geometry;
}

export function createSmoothMeshGeometryFromData(tessInfo) {
  const geometry = new Geometry();
  const vec = arr => new Vector3().fromArray(arr);
  
  for (let [tr, normals] of tessInfo) {
    if (!normals || normals.find(n => n[0] === null || n[1] === null || n[2] === null)) {
      normals = undefined;
    }
    const a = geometry.vertices.length;
    const b = a + 1;
    const c = a + 2;
    const face = new Face3(a, b, c, normals && normals.map(vec));
    tr.forEach(v => geometry.vertices.push(vec(v)));
    geometry.faces.push(face);
  }
  geometry.mergeVertices();
  geometry.computeFaceNormals();
  return geometry;
}