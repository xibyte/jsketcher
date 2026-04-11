/**
 * Tessellate a BoundingCurve.
 *
 * The curve shape only depends on the 4 edge ControlPoints and their
 * weights — and both live on the per-vertex ControlPoints shared between
 * adjacent surfaces, so either surface is a valid "reference surface" for
 * sampling: both produce the same xyz along the boundary isoline.
 *
 * Results are always stored in the curve's INTRINSIC direction — that is,
 * `samples[0]` is at `curve.cp[0]` and `samples[n]` is at `curve.cp[3]`,
 * regardless of which reference surface was used to evaluate them. (Grid
 * cells ARE ControlPoints, which extend Vertex, so `curve.cp[k]` IS the
 * vertex identity.) If the reference surface walks the curve backwards
 * relative to its intrinsic direction (common for hole-filled surfaces
 * that land on shared edges whose first registrant used the opposite
 * orientation), we flip `t` before calling `ref.eval()`. That keeps
 * `tessellateSurface`'s `rev[side] ? samples[n-k] : samples[k]` reader
 * correct on both sides of every shared curve.
 *
 * Corner samples (first and last) are anchored on the corner Vertex via
 * `Vertex.cornerTessPoint`, so every BoundingCurve that meets at that
 * vertex shares the same CurveTessPoint instance. The corner sample's
 * `xyz` field is the Vertex's `position` array itself (by reference), so
 * moving the vertex is instantly visible on every adjacent curve without
 * re-sampling the corner.
 *
 * When `curve.samples` already exists at the requested resolution, this
 * function refreshes the interior xyz values **in place** — preserving
 * the CurveTessPoint instances that any downstream BorderTessPoints /
 * TessEdges / Tiles still reference. A real reallocation happens only
 * when the resolution changes or the curve has never been tessellated.
 */
import type {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from '../models/BoundingCurve/BoundingCurve.entity';
import type {Vertex} from '../models/Vertex/Vertex.entity';
import {CurveTessPoint} from './types';

export function tessellateCurve(
  curve: BoundingCurve,
  referenceSurface: NurbsSurface,
  refSide: number,
  resolution: number,
): CurveTessPoint[] {
  const n = resolution;

  // The curve's intrinsic direction is whatever `curve.cp[0]..cp[3]` was
  // ordered at creation time. If the reference surface's edge order doesn't
  // start at cp[0], it's walking the curve backwards, so we flip t when
  // asking it to evaluate points along the boundary. A grid cell IS a
  // ControlPoint (which extends Vertex) so we compare by identity.
  const refStart = referenceSurface.getEdgeVertices(refSide)[0];
  const reversed = curve.cp[0] !== refStart;

  // ---------------------------------------------------------------
  // Fast path: in-place refresh of interior xyz values.
  // Corner samples auto-track via Vertex.position references, so
  // the only thing that ever needs updating is samples[1..n-1].
  // ---------------------------------------------------------------
  if (curve.samples && curve.tessResolution === n && curve.samples.length === n + 1) {
    for (let k = 1; k < n; k++) {
      const tIntrinsic = k / n;
      const tRef = reversed ? (1 - tIntrinsic) : tIntrinsic;
      const [u, v] = uvForSide(refSide, tRef);
      const p = referenceSurface.eval(u, v);
      const sample = curve.samples[k];
      sample.xyz[0] = p[0];
      sample.xyz[1] = p[1];
      sample.xyz[2] = p[2];
    }
    curve.tessDirty = false;
    return curve.samples;
  }

  // ---------------------------------------------------------------
  // Fresh allocation. Samples are laid out in intrinsic direction so
  // later callers from either side read a consistent array.
  // ---------------------------------------------------------------
  const samples: CurveTessPoint[] = new Array(n + 1);
  samples[0] = ensureCornerPoint(curve.cp[0]);
  samples[n] = ensureCornerPoint(curve.cp[3]);

  for (let k = 1; k < n; k++) {
    const tIntrinsic = k / n;
    const tRef = reversed ? (1 - tIntrinsic) : tIntrinsic;
    const [u, v] = uvForSide(refSide, tRef);
    const p = referenceSurface.eval(u, v);
    samples[k] = new CurveTessPoint([p[0], p[1], p[2]]);
  }

  curve.samples = samples;
  curve.tessResolution = n;
  curve.tessDirty = false;
  // Downstream state that pointed at the old sample instances is now
  // stale — callers (tessellateSurface) will rebuild it on the same pass.
  curve.perSurface.clear();
  curve.edges = [];

  return samples;
}

function uvForSide(side: number, t: number): [number, number] {
  switch (side) {
    case 0: return [t, 0];   // bottom
    case 1: return [1, t];   // right
    case 2: return [t, 1];   // top
    case 3: return [0, t];   // left
    default: return [t, 0];
  }
}

/**
 * Lazily create (or re-anchor) the shared corner CurveTessPoint for a
 * Vertex. The `xyz` field references the vertex's own `position` array, so
 * mutating the vertex via `Vertex.set()` automatically updates the sample
 * for every curve and tile that reads it.
 */
function ensureCornerPoint(vertex: Vertex): CurveTessPoint {
  if (!vertex.cornerTessPoint) {
    vertex.cornerTessPoint = new CurveTessPoint(vertex.position);
  } else {
    vertex.cornerTessPoint.xyz = vertex.position;
  }
  return vertex.cornerTessPoint;
}
