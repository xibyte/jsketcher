import {BoxGeometry, BufferGeometry, BufferAttribute, Vector3} from 'three';
import {normalOfCCWSeq} from "cad/cad-utils";

export function createBoxGeometry(width, height, depth) {
  return new BoxGeometry(width, height, depth);
}

export function createMeshGeometry(triangles) {

  const vertices = [];
  const normals = [];
  triangles.forEach(tr => {
    const normal = normalOfCCWSeq(tr);
    tr.forEach(p => {
      vertices.push(p.x, p.y, p.z);
      normals.push(normal.x, normal.y, normal.z);
    })
  });


  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute( new Float32Array(vertices), 3 ) );
  geometry.setAttribute('normal', new BufferAttribute( new Float32Array(normals), 3));

  return geometry;
}
