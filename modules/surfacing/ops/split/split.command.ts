import {PatchCage, CageVertex, NurbsPatch} from '../../PatchCage';
import {Vec3} from '../../patchCageTypes';
import {splitBezierRow, cloneWeights, BoundarySplitResult} from '../../patchCageHelpers';

/**
 * Compute the propagation set for an isoline split (without splitting).
 * Returns the list of {idx, dir, t} for all affected patches.
 */
export function computeIsolinePropagation(cage: PatchCage, patchIdx: number, direction: 'u' | 'v', t: number): {idx: number, dir: 'u' | 'v', t: number}[] {
  const result: {idx: number, dir: 'u' | 'v', t: number}[] = [];
  const visited = new Set<number>();
  const queue: {idx: number, dir: 'u' | 'v', t: number}[] = [{idx: patchIdx, dir: direction, t}];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur.idx)) continue;
    visited.add(cur.idx);
    result.push(cur);

    const cutSides = cur.dir === 'u' ? [0, 2] : [3, 1];
    const adj = cage.findAdjacentPatches(cur.idx);
    for (const a of adj) {
      if (visited.has(a.otherIdx)) continue;
      if (!cutSides.includes(a.side)) continue;
      const otherIsHorizontal = a.otherSide === 0 || a.otherSide === 2;
      const adjDir: 'u' | 'v' = otherIsHorizontal ? 'u' : 'v';
      const adjT = a.reversed ? (1 - cur.t) : cur.t;
      queue.push({idx: a.otherIdx, dir: adjDir, t: adjT});
    }
  }
  return result;
}

/**
 * Tessellate an isoline on a single patch as a polyline.
 */
export function tessellateIsoline(cage: PatchCage, patchIdx: number, direction: 'u' | 'v', t: number, segments: number = 24): Vec3[] {
  const patch = cage.patches[patchIdx];
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const p = direction === 'u' ? patch.eval(t, s) : patch.eval(s, t);
    pts.push(p);
  }
  return pts;
}

/**
 * Split along an isoline, propagating across ALL connected patches.
 */
export function splitIsoline(cage: PatchCage, patchIdx: number, direction: 'u' | 'v', t: number): void {
  const toSplit = computeIsolinePropagation(cage, patchIdx, direction, t);

  // Cache: for shared boundary edges, compute the De Casteljau split ONCE
  // and reuse the same CageVertex instances across both patches.
  const boundaryCache = new Map<CageVertex, Map<CageVertex, BoundarySplitResult>>();

  function getCachedSplit(c0: CageVertex, c3: CageVertex): BoundarySplitResult | null {
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

  function cacheBoundarySplit(v0: CageVertex, v1: CageVertex, v2: CageVertex, v3: CageVertex, st: number): BoundarySplitResult {
    const existing = getCachedSplit(v0, v3);
    if (existing) return existing;

    const {left, mid, right} = splitBezierRow(v0, v1, v2, v3, st);
    const result: BoundarySplitResult = {
      leftH: left,
      mid: new CageVertex(mid[0], mid[1], mid[2]),
      rightH: right,
    };
    if (!boundaryCache.has(v0)) boundaryCache.set(v0, new Map());
    boundaryCache.get(v0)!.set(v3, result);
    return result;
  }

  // Split in reverse index order so splice doesn't invalidate earlier indices
  toSplit.sort((a, b) => b.idx - a.idx);
  for (const s of toSplit) {
    splitSinglePatchShared(cage, s.idx, s.dir, s.t, cacheBoundarySplit);
  }
}

/**
 * Split a single patch. For boundary rows/cols, use the cache to share
 * ALL split vertices (handles + midpoint) with adjacent patches.
 */
function splitSinglePatchShared(
  cage: PatchCage,
  patchIdx: number, direction: 'u' | 'v', t: number,
  getBoundarySplit: (v0: CageVertex, v1: CageVertex, v2: CageVertex, v3: CageVertex, t: number) => BoundarySplitResult
): void {
  const patch = cage.patches[patchIdx];
  const g = patch.grid;

  if (direction === 'u') {
    const leftGrid: CageVertex[][] = [];
    const rightGrid: CageVertex[][] = [];

    for (let row = 0; row < 4; row++) {
      if (row === 0 || row === 3) {
        // Boundary row: use cached split for shared vertices
        const bs = getBoundarySplit(g[row][0], g[row][1], g[row][2], g[row][3], t);
        leftGrid.push([g[row][0], bs.leftH[0], bs.leftH[1], bs.mid]);
        rightGrid.push([bs.mid, bs.rightH[0], bs.rightH[1], g[row][3]]);
      } else {
        // Interior row: fresh split, no sharing needed
        const {left, mid, right} = splitBezierRow(g[row][0], g[row][1], g[row][2], g[row][3], t);
        const midV = new CageVertex(mid[0], mid[1], mid[2]);
        leftGrid.push([g[row][0], left[0], left[1], midV]);
        rightGrid.push([midV, right[0], right[1], g[row][3]]);
      }
    }

    cage.patches.splice(patchIdx, 1,
      new NurbsPatch(leftGrid, cloneWeights(patch.weights)),
      new NurbsPatch(rightGrid, cloneWeights(patch.weights))
    );
    cage.notifySplice(patchIdx, 1, 2);
  } else {
    const bottomGrid: CageVertex[][] = [[], [], [], []];
    const topGrid: CageVertex[][] = [[], [], [], []];

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
        const {left, mid, right} = splitBezierRow(g[0][col], g[1][col], g[2][col], g[3][col], t);
        const midV = new CageVertex(mid[0], mid[1], mid[2]);
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

    cage.patches.splice(patchIdx, 1,
      new NurbsPatch(bottomGrid, cloneWeights(patch.weights)),
      new NurbsPatch(topGrid, cloneWeights(patch.weights))
    );
    cage.notifySplice(patchIdx, 1, 2);
  }
}
