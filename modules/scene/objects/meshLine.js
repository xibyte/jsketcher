import * as vec from 'math/vec';
import {BufferAttribute, BufferGeometry} from 'three';
import {perpendicularVector} from "geom/euclidean";

export function createMeshLineGeometry(points, width) {
  const geometry = new BufferGeometry();
  const vertices = [];
  const index = [];
  let base = null;
  for (let i = 1; i < points.length; i++) {

    const a  = points[i - 1];
    const b  = points[i];
    const ab = vec._normalize(vec.sub(b, a));

    const dirs = [];
    dirs[0] = perpendicularVector(ab);
    dirs[1] = vec.cross(ab, dirs[0]);
    dirs[2] = vec.negate(dirs[0]);
    dirs[3] = vec.negate(dirs[1]);

    dirs.forEach(d => vec._mul(d, width));
    if (base === null) {
      base = dirs.map(d => vec.add(a, d));
    }
    const lid = dirs.map(d => vec.add(b, d));

    const off = vertices.length;
    base.forEach(p => vertices.push(...p));
    lid.forEach(p => vertices.push(...p));
    base = lid;

    [
      [0, 4, 3],
      [3, 4, 7],
      [2, 3, 7],
      [7, 6, 2],
      [0, 1, 5],
      [5, 4, 0],
      [1, 2, 6],
      [6, 5, 1],
    ].forEach(([a, b, c]) => index.push(a + off, b + off, c + off));
  }
  geometry.setIndex( index );
  geometry.setAttribute('position', new BufferAttribute( new Float32Array(vertices), 3));
  geometry.computeVertexNormals();
  return geometry;
}
