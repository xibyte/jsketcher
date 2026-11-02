/**
 * Pure-math tessellation functions for a BoundingCurve.
 *
 * Two entry points:
 *   - `allocateCurveSamples` — fresh allocation of CurveTessPoint[]
 *   - `refreshCurveSamples`  — in-place update of existing samples' xyz
 *
 * The entity (BoundingCurve.ensureTessellated) decides which to call.
 * Neither function reads or writes entity lifecycle state.
 */
import type {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from '../models/BoundingCurve/BoundingCurve.entity';
import type {Vertex} from '../models/Vertex/Vertex.entity';
import {CurveTessPoint} from './types';

/**
 * Allocate a fresh CurveTessPoint[] array for a curve at the given
 * resolution. Corner samples are anchored on the corner Vertex so
 * every curve meeting at that vertex shares the same instance.
 */
export function allocateCurveSamples(
  curve: BoundingCurve,
  referenceSurface: NurbsSurface,
  refSide: number,
  resolution: number,
): CurveTessPoint[] {
  const n = resolution;
  const reversed = isReversed(curve, referenceSurface, refSide);

  const samples: CurveTessPoint[] = new Array(n + 1);
  samples[0] = ensureCornerPoint(curve.cp[0]);
  samples[n] = ensureCornerPoint(curve.cp[3]);

  for (let k = 1; k < n; k++) {
    const tRef = reversed ? (1 - k / n) : (k / n);
    const [u, v] = uvForSide(refSide, tRef);
    const p = referenceSurface.eval(u, v);
    samples[k] = new CurveTessPoint([p[0], p[1], p[2]]);
  }

  return samples;
}

function isReversed(curve: BoundingCurve, referenceSurface: NurbsSurface, refSide: number): boolean {
  return curve.cp[0] !== referenceSurface.getEdgeVertices(refSide)[0];
}

function uvForSide(side: number, t: number): [number, number] {
  switch (side) {
    case 0: return [t, 0];
    case 1: return [1, t];
    case 2: return [t, 1];
    case 3: return [0, t];
    default: return [t, 0];
  }
}

function ensureCornerPoint(vertex: Vertex): CurveTessPoint {
  if (!vertex.cornerTessPoint) {
    vertex.cornerTessPoint = new CurveTessPoint(vertex.position);
  } else {
    vertex.cornerTessPoint.xyz = vertex.position;
  }
  return vertex.cornerTessPoint;
}
