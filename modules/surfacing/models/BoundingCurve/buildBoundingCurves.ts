import type {SurfacingContext} from '../../SurfacingContext';
import type {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {BoundingCurve} from './BoundingCurve.entity';

type CurveSet = {
  bottom: BoundingCurve;
  right: BoundingCurve;
  top: BoundingCurve;
  left: BoundingCurve;
};

/**
 * Local cache used by primitives / deserialize / ops that build many
 * NurbsSurfaces in one pass and need shared edges to land on the SAME
 * BoundingCurve instance. Cache is keyed by an order-independent
 * signature of the 4 edge CPs, so the first surface to touch an edge
 * creates the curve and any neighbor with the same 4 CPs picks it up
 * from the cache.
 *
 * The cache is short-lived — created, used, thrown away. There is no
 * global registry; once construction is done, sharing lives entirely in
 * the surface → BoundingCurve reference graph.
 */
export class LocalBoundingCurveCache {

  private map = new Map<string, BoundingCurve>();

  /** Fetch or create the curve for a 4-CP edge. */
  getOrCreate(
    ctx: SurfacingContext,
    side: number,
    cps: [ControlPoint, ControlPoint, ControlPoint, ControlPoint],
  ): BoundingCurve {
    const ids = cps.map(c => c.id);
    const fwd = ids.join('|');
    const rev = [...ids].reverse().join('|');
    const key = fwd < rev ? fwd : rev;
    const hit = this.map.get(key);
    if (hit) return hit;
    const fresh = new BoundingCurve(ctx, side, cps);
    this.map.set(key, fresh);
    return fresh;
  }

  /** Build the 4-curve set for a surface grid, sharing via this cache. */
  curvesFor(ctx: SurfacingContext, grid: ControlPoint[][]): CurveSet {
    return {
      bottom: this.getOrCreate(ctx, 0, [grid[0][0], grid[0][1], grid[0][2], grid[0][3]]),
      right:  this.getOrCreate(ctx, 1, [grid[0][3], grid[1][3], grid[2][3], grid[3][3]]),
      top:    this.getOrCreate(ctx, 2, [grid[3][0], grid[3][1], grid[3][2], grid[3][3]]),
      left:   this.getOrCreate(ctx, 3, [grid[0][0], grid[1][0], grid[2][0], grid[3][0]]),
    };
  }

  /** Seed the cache with an existing curve — e.g. a neighbor's curve. */
  register(curve: BoundingCurve): void {
    const ids = curve.cp.map(c => c.id);
    const fwd = ids.join('|');
    const rev = [...ids].reverse().join('|');
    const key = fwd < rev ? fwd : rev;
    this.map.set(key, curve);
  }
}

/**
 * Convenience factory: build the 4 bounding curves of a 4×4 NURBS grid
 * from scratch. Used by callers that don't need to share curves with
 * any existing adjacent surface (plane primitives, fresh fill-hole
 * patches with no seam stitching, …).
 *
 * For callers that DO stitch against existing neighbors — split halves
 * sharing a middle seam, mirror patches sharing the mirror-plane edge,
 * bridge patches sharing both end rows, deserialize walking a per-scene
 * edge-key map — build the `{bottom, right, top, left}` object by hand
 * and reuse the neighbor's `BoundingCurve` instances directly.
 */
export function createBoundingCurves(
  ctx: SurfacingContext,
  grid: ControlPoint[][],
): {
  bottom: BoundingCurve;
  right: BoundingCurve;
  top: BoundingCurve;
  left: BoundingCurve;
} {
  return {
    bottom: new BoundingCurve(ctx, 0, [grid[0][0], grid[0][1], grid[0][2], grid[0][3]]),
    right:  new BoundingCurve(ctx, 1, [grid[0][3], grid[1][3], grid[2][3], grid[3][3]]),
    top:    new BoundingCurve(ctx, 2, [grid[3][0], grid[3][1], grid[3][2], grid[3][3]]),
    left:   new BoundingCurve(ctx, 3, [grid[0][0], grid[1][0], grid[2][0], grid[3][0]]),
  };
}
