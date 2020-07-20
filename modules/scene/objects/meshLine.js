import * as vec from 'math/vec';
import {Face3, Geometry, Vector3} from 'three';
import {perpendicularVector} from "geom/euclidean";

export function createMeshLineGeometry(points, width) {
  const vThree = arr => new Vector3().fromArray(arr);
  const geometry = new Geometry();
  let base = null;
  for (let i = 1; i < points.length; i++) {

    let a  = points[i - 1];
    let b  = points[i];
    let ab = vec._normalize(vec.sub(b, a));

    let dirs = [];
    dirs[0] = perpendicularVector(ab);
    dirs[1] = vec.cross(ab, dirs[0]);
    dirs[2] = vec.negate(dirs[0]);
    dirs[3] = vec.negate(dirs[1]);

    dirs.forEach(d => vec._mul(d, width));
    if (base === null) {
      base = dirs.map(d => vec.add(a, d));
    }
    let lid = dirs.map(d => vec.add(b, d));

    let off = geometry.vertices.length;
    base.forEach(p => geometry.vertices.push(vThree(p)));
    lid.forEach(p => geometry.vertices.push(vThree(p)));
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
    ].forEach(([a, b, c]) => geometry.faces.push(new Face3(a + off, b + off, c + off)));
  }
  geometry.computeFaceNormals();
  return geometry;
}
