import * as vec from 'math/vec';
import {Vec3} from 'math/vec';
import {BSPTolerances} from './bspTolerances';
import {CSGTriangle, triangleArea} from './csgTriangle';
import {CSGMesh} from './meshBoolean';
import {Shell} from '../../topo/shell';
import Vector from 'math/vector';

/**
 * Convert a BRep Shell into a CSG mesh by tessellating each face.
 *
 * Critical: triangle winding must produce outward-facing normals that match
 * the BRep surface normals. The BSP algorithm relies on this for correct
 * inside/outside classification.
 */
export function shellToCSGMesh(
  shell: Shell,
  faceIds: Map<any, string>,
  tolerances: BSPTolerances,
  tessellator: (face: any) => Vector[][]
): CSGMesh {
  const triangles: CSGTriangle[] = [];

  for (const face of shell.faces) {
    const faceId = faceIds.get(face) || `face_${shell.faces.indexOf(face)}`;
    const surface = face.surface;

    // Get the face's outward normal — this is the ground truth
    const faceNormal = surface.normalInMiddle();
    const fn: Vec3 = [faceNormal.x, faceNormal.y, faceNormal.z];

    let polygons: Vector[][];
    try {
      polygons = tessellator(face);
    } catch (e) {
      console.warn('Failed to tessellate face', faceId, e);
      continue;
    }

    for (const poly of polygons) {
      if (poly.length < 3) continue;

      for (let i = 2; i < poly.length; i++) {
        let p0 = poly[0], p1 = poly[i - 1], p2 = poly[i];

        const v0: Vec3 = [p0.x, p0.y, p0.z];
        const v1: Vec3 = [p1.x, p1.y, p1.z];
        const v2: Vec3 = [p2.x, p2.y, p2.z];

        const area = triangleArea(v0, v1, v2);
        if (area < tolerances.areaEpsilon) continue;

        // Compute triangle normal from winding
        let triN = vec._normalize(vec.cross(vec.sub(v1, v0), vec.sub(v2, v0)));

        // If winding normal disagrees with surface normal, flip the triangle
        if (vec.dot(triN, fn) < 0) {
          const tmp = p1; p1 = p2; p2 = tmp;
          const tv = v1.slice() as Vec3;
          v1[0] = v2[0]; v1[1] = v2[1]; v1[2] = v2[2];
          v2[0] = tv[0]; v2[1] = tv[1]; v2[2] = tv[2];
          triN = vec.negate(triN) as Vec3;
        }

        // Use surface normal for smooth shading on curved faces,
        // but use the triangle flat normal for BSP classification
        let n0: Vec3, n1: Vec3, n2: Vec3;
        try {
          const sn0 = surface.normal(p0);
          const sn1 = surface.normal(p1);
          const sn2 = surface.normal(p2);
          n0 = [sn0.x, sn0.y, sn0.z];
          n1 = [sn1.x, sn1.y, sn1.z];
          n2 = [sn2.x, sn2.y, sn2.z];
        } catch (e) {
          n0 = triN; n1 = triN; n2 = triN;
        }

        triangles.push({
          vertices: [
            {pos: v0, normal: n0},
            {pos: v1, normal: n1},
            {pos: v2, normal: n2},
          ],
          normal: triN,
          originFaceId: faceId,
          originSurface: surface,
        });
      }
    }
  }

  return {triangles};
}
