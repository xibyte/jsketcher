/**
 * Curve tessellation helpers used by surfacing visuals.
 */
import type {Vec3} from 'math/vec';

/**
 * Tessellate a cubic Bézier curve defined by 4 control points into N+1
 * points (N segments). Returns an array of [x,y,z] triples.
 */
export function tessellateCubicBezier(cps: Vec3[], segments: number = 24): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const b0 = mt * mt * mt;
    const b1 = 3 * mt * mt * t;
    const b2 = 3 * mt * t * t;
    const b3 = t * t * t;
    pts.push([
      b0 * cps[0][0] + b1 * cps[1][0] + b2 * cps[2][0] + b3 * cps[3][0],
      b0 * cps[0][1] + b1 * cps[1][1] + b2 * cps[2][1] + b3 * cps[3][1],
      b0 * cps[0][2] + b1 * cps[1][2] + b2 * cps[2][2] + b3 * cps[3][2],
    ]);
  }
  return pts;
}
