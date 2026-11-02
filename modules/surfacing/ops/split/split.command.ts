import {Scene, NurbsSurface} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {Vec3} from '../../patchCageTypes';
import {splitBezierRow, BoundarySplitResult} from '../../patchCageHelpers';

/**
 * Compute the propagation set for an isoline split (without splitting).
 * Returns the list of {idx, dir, t} for all affected patches.
 */
export function computeIsolinePropagation(scene: Scene, surface: NurbsSurface, direction: 'u' | 'v', t: number): {surface: NurbsSurface, dir: 'u' | 'v', t: number}[] {
  const result: {surface: NurbsSurface, dir: 'u' | 'v', t: number}[] = [];
  const visited = new Set<NurbsSurface>();
  const queue: {surface: NurbsSurface, dir: 'u' | 'v', t: number}[] = [{surface, dir: direction, t}];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur.surface)) continue;
    visited.add(cur.surface);
    result.push(cur);

    const cutSides = cur.dir === 'u' ? [0, 2] : [3, 1];
    const adj = cur.surface.findAdjacentSurfaces();
    for (const a of adj) {
      if (visited.has(a.other)) continue;
      if (!cutSides.includes(a.side)) continue;
      const otherIsHorizontal = a.otherSide === 0 || a.otherSide === 2;
      const adjDir: 'u' | 'v' = otherIsHorizontal ? 'u' : 'v';
      const adjT = a.reversed ? (1 - cur.t) : cur.t;
      queue.push({surface: a.other, dir: adjDir, t: adjT});
    }
  }
  return result;
}

/**
 * Tessellate an isoline on a single surface as a polyline.
 */
export function tessellateIsoline(scene: Scene, surface: NurbsSurface, direction: 'u' | 'v', t: number, segments: number = 24): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const p = direction === 'u' ? surface.eval(t, s) : surface.eval(s, t);
    pts.push(p);
  }
  return pts;
}

/**
 * Split along an isoline, propagating across ALL connected surfaces.
 */
export function splitIsoline(scene: Scene, surface: NurbsSurface, direction: 'u' | 'v', t: number): void {
  const toSplit = computeIsolinePropagation(scene, surface, direction, t);

  // Cache: for shared boundary edges, compute the De Casteljau split ONCE
  // and reuse the same ControlPoint instances across both patches.
  const boundaryCache = new Map<ControlPoint, Map<ControlPoint, BoundarySplitResult>>();

  function getCachedSplit(c0: ControlPoint, c3: ControlPoint): BoundarySplitResult | null {
    if (boundaryCache.has(c0) && boundaryCache.get(c0)!.has(c3)) return boundaryCache.get(c0)!.get(c3)!;
    if (boundaryCache.has(c3) && boundaryCache.get(c3)!.has(c0)) {
      // Reverse: swap left/right handles
      const fwd = boundaryCache.get(c3)!.get(c0)!;
      return {
        leftH: [fwd.rightH[1], fwd.rightH[0]],
        mid: fwd.mid,
        rightH: [fwd.leftH[1], fwd.leftH[0]],
      };
    }
    return null;
  }

  function cacheBoundarySplit(v0: ControlPoint, v1: ControlPoint, v2: ControlPoint, v3: ControlPoint, st: number): BoundarySplitResult {
    const existing = getCachedSplit(v0, v3);
    if (existing) return existing;

    const {left, mid, right} = splitBezierRow(scene.ctx, v0, v1, v2, v3, st);
    const result: BoundarySplitResult = {
      leftH: left,
      mid: new ControlPoint(scene.ctx, mid[0], mid[1], mid[2]),
      rightH: right,
    };
    if (!boundaryCache.has(v0)) boundaryCache.set(v0, new Map());
    boundaryCache.get(v0)!.set(v3, result);
    return result;
  }

  // Shared across every surface in the cascade so split halves of
  // adjacent surfaces share the SAME new BoundingCurve on their seams.
  const curveCache = new LocalBoundingCurveCache();

  for (const s of toSplit) {
    splitSingleSurfaceShared(scene, s.surface, s.dir, s.t, cacheBoundarySplit, curveCache);
  }
}

/**
 * Split a single patch. For boundary rows/cols, use the cache to share
 * ALL split vertices (handles + midpoint) with adjacent patches.
 */
function splitSingleSurfaceShared(
  scene: Scene,
  surface: NurbsSurface, direction: 'u' | 'v', t: number,
  getBoundarySplit: (v0: ControlPoint, v1: ControlPoint, v2: ControlPoint, v3: ControlPoint, t: number) => BoundarySplitResult,
  curveCache: LocalBoundingCurveCache,
): void {
  const sourceSet = surface.surfaceSet; // capture before splice
  const g = surface.grid;

  // Seed the curve cache with the surface's 4 curves so the halves' outer
  // edges (the ones that don't move) reuse them directly. The middle
  // seam curve is created once (by leftSurface's curvesFor call) and
  // found in the cache by rightSurface. Cross-surface sharing of the split
  // halves works the same way: the caller passes ONE cache through
  // every splitSingleSurfaceShared call in the cascade.
  curveCache.register(surface.boundingCurves.bottom);
  curveCache.register(surface.boundingCurves.right);
  curveCache.register(surface.boundingCurves.top);
  curveCache.register(surface.boundingCurves.left);

  let leftSurface: NurbsSurface, rightSurface: NurbsSurface;

  if (direction === 'u') {
    const leftGrid: ControlPoint[][] = [];
    const rightGrid: ControlPoint[][] = [];

    for (let row = 0; row < 4; row++) {
      if (row === 0 || row === 3) {
        // Boundary row: use cached split for shared vertices
        const bs = getBoundarySplit(g[row][0], g[row][1], g[row][2], g[row][3], t);
        leftGrid.push([g[row][0], bs.leftH[0], bs.leftH[1], bs.mid]);
        rightGrid.push([bs.mid, bs.rightH[0], bs.rightH[1], g[row][3]]);
      } else {
        // Interior row: fresh split, no sharing needed
        const {left, mid, right} = splitBezierRow(scene.ctx, g[row][0], g[row][1], g[row][2], g[row][3], t);
        const midV = new ControlPoint(scene.ctx, mid[0], mid[1], mid[2]);
        leftGrid.push([g[row][0], left[0], left[1], midV]);
        rightGrid.push([midV, right[0], right[1], g[row][3]]);
      }
    }

    leftSurface = new NurbsSurface(scene.ctx, leftGrid,  curveCache.curvesFor(scene.ctx, leftGrid));
    rightSurface = new NurbsSurface(scene.ctx, rightGrid, curveCache.curvesFor(scene.ctx, rightGrid));
  } else {
    const bottomGrid: ControlPoint[][] = [[], [], [], []];
    const topGrid: ControlPoint[][] = [[], [], [], []];

    for (let col = 0; col < 4; col++) {
      if (col === 0 || col === 3) {
        // Boundary column: use cached split
        const bs = getBoundarySplit(g[0][col], g[1][col], g[2][col], g[3][col], t);
        bottomGrid[0][col] = g[0][col];
        bottomGrid[1][col] = bs.leftH[0];
        bottomGrid[2][col] = bs.leftH[1];
        bottomGrid[3][col] = bs.mid;
        topGrid[0][col] = bs.mid;
        topGrid[1][col] = bs.rightH[0];
        topGrid[2][col] = bs.rightH[1];
        topGrid[3][col] = g[3][col];
      } else {
        // Interior column: fresh split
        const {left, mid, right} = splitBezierRow(scene.ctx, g[0][col], g[1][col], g[2][col], g[3][col], t);
        const midV = new ControlPoint(scene.ctx, mid[0], mid[1], mid[2]);
        bottomGrid[0][col] = g[0][col];
        bottomGrid[1][col] = left[0];
        bottomGrid[2][col] = left[1];
        bottomGrid[3][col] = midV;
        topGrid[0][col] = midV;
        topGrid[1][col] = right[0];
        topGrid[2][col] = right[1];
        topGrid[3][col] = g[3][col];
      }
    }

    leftSurface = new NurbsSurface(scene.ctx, bottomGrid, curveCache.curvesFor(scene.ctx, bottomGrid));
    rightSurface = new NurbsSurface(scene.ctx, topGrid,    curveCache.curvesFor(scene.ctx, topGrid));
  }

  // Propagate the surface set: assign directly so both halves
  // remain part of the same logical face.
  if (sourceSet) {
    sourceSet.surfaces.delete(surface);
    surface.surfaceSet = null;
    leftSurface.surfaceSet = sourceSet;
    rightSurface.surfaceSet = sourceSet;
    sourceSet.surfaces.add(leftSurface);
    sourceSet.surfaces.add(rightSurface);
  }

  surface.replaceWith([leftSurface, rightSurface]);
}
