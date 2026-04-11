/**
 * Geometry factories and shared singletons for surfacing.
 */
import {SphereGeometry, BufferGeometry, BufferAttribute} from 'three';

/** Unit sphere shared by every control-point handle (visible + picker). */
export const sharedSphereGeometry = new SphereGeometry(1);

/**
 * Build an indexed Three.js BufferGeometry from a tessellation triple
 * (positions/normals/indices) emitted by NurbsSurface.tessellate().
 */
export function buildTessellatedGeometry(tess: {
  positions: number[] | Float32Array,
  normals: number[] | Float32Array,
  indices: number[] | Uint32Array,
}): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(
    tess.positions instanceof Float32Array ? tess.positions : new Float32Array(tess.positions), 3
  ));
  g.setAttribute('normal', new BufferAttribute(
    tess.normals instanceof Float32Array ? tess.normals : new Float32Array(tess.normals), 3
  ));
  g.setIndex(new BufferAttribute(
    tess.indices instanceof Uint32Array ? tess.indices : new Uint32Array(tess.indices), 1
  ));
  return g;
}

/**
 * Build a non-indexed polyline geometry from a flat XYZ array or an array of
 * [x,y,z] points.
 */
export function buildPolylineGeometry(points: number[] | number[][]): BufferGeometry {
  let flat: Float32Array;
  if (points.length === 0) {
    flat = new Float32Array(0);
  } else if (Array.isArray(points[0])) {
    const pts = points as number[][];
    flat = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      flat[i * 3]     = pts[i][0];
      flat[i * 3 + 1] = pts[i][1];
      flat[i * 3 + 2] = pts[i][2];
    }
  } else {
    flat = new Float32Array(points as number[]);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(flat, 3));
  return g;
}

/**
 * Build the hover-highlight geometry for a surface: same topology as the
 * shaded mesh but pushed slightly along the normals so it sits above the
 * surface without z-fighting.
 */
export function buildOffsetSurfaceGeometry(
  tess: {positions: number[], normals: number[], indices: number[]},
  offset: number = 0.3,
): BufferGeometry {
  const offsetVerts = new Float32Array(tess.positions.length);
  for (let i = 0; i < tess.positions.length; i += 3) {
    offsetVerts[i]     = tess.positions[i]     + tess.normals[i]     * offset;
    offsetVerts[i + 1] = tess.positions[i + 1] + tess.normals[i + 1] * offset;
    offsetVerts[i + 2] = tess.positions[i + 2] + tess.normals[i + 2] * offset;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(offsetVerts, 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(tess.normals), 3));
  g.setIndex(new BufferAttribute(new Uint32Array(tess.indices), 1));
  return g;
}
