import {PatchCage, CageVertex, NurbsPatch, MirrorConstraint, ArcConstraint} from '../../models/Scene/Scene.entity';
import {Vec3} from '../../patchCageTypes';
import {add as vadd, sub as vsub, mul as vscale, normalize as vnormalize, distance as vdist, cross as vcross, dot as vdot} from 'math/vec';

/**
 * Mirror all patches along the boundary that contains the given edge.
 * Computes the mirror plane from the selected edge, finds all patches
 * whose edge lies on that plane, and mirrors each one.
 * Returns indices of all newly created mirror patches.
 */
export function mirrorAcrossEdge(cage: PatchCage, patchIdx: number, side: number): number[] {
  const group = cage.findGroupOfPatch(patchIdx);
  const patch = cage.patches[patchIdx];
  const edgeVerts = patch.getEdgeVertices(side);

  // Build mirror plane from the selected edge
  const e0 = edgeVerts[0].position;
  const e3 = edgeVerts[3].position;
  const edgeDir = vnormalize(vsub(e3, e0));

  // Get patch normal at edge midpoint
  let u = 0.5, v = 0.5;
  if (side === 0) v = 0;
  else if (side === 1) u = 1;
  else if (side === 2) v = 1;
  else if (side === 3) u = 0;
  const surfNormal = patch.normal(u, v);

  // Plane normal = cross(edgeDir, surfNormal)
  const planeNormal = vnormalize(vcross(edgeDir, surfNormal));
  const planePoint: Vec3 = [...e0];

  // Walk adjacency graph to find all patches along the mirror boundary.
  const toMirror = traceMirrorBoundary(cage, patchIdx, side);

  const result: number[] = [];
  for (const entry of toMirror) {
    result.push(mirrorSinglePatch(cage, entry.patchIdx, entry.side, planePoint, planeNormal));
  }

  // Connect shared edges between adjacent mirror patches
  stitchMirrorEdges(cage, result);

  cage.notifyPush(result.length, group);
  return result;
}

/**
 * Trace the mirror boundary by walking the adjacency graph from the
 * selected edge's corner vertices in both directions.
 */
function traceMirrorBoundary(cage: PatchCage, startPatchIdx: number, startSide: number): {patchIdx: number, side: number}[] {
  const result: {patchIdx: number, side: number}[] = [{patchIdx: startPatchIdx, side: startSide}];
  const visited = new Set<number>();
  visited.add(startPatchIdx);

  const startEdge = cage.patches[startPatchIdx].getEdgeVertices(startSide);

  // Walk from each corner of the selected edge
  walkBoundary(cage, startEdge[0], startPatchIdx, startSide, visited, result);
  walkBoundary(cage, startEdge[3], startPatchIdx, startSide, visited, result);

  return result;
}

/**
 * Walk the boundary chain from a corner vertex through adjacent patches.
 * Uses shared vertex identity — no tolerances.
 */
function walkBoundary(
  cage: PatchCage,
  corner: CageVertex,
  fromPatchIdx: number,
  fromSide: number,
  visited: Set<number>,
  result: {patchIdx: number, side: number}[],
): void {
  // Find adjacent patches of fromPatch that connect at this corner
  const adj = cage.findAdjacentPatches(fromPatchIdx);
  for (const a of adj) {
    if (visited.has(a.otherIdx)) continue;

    // Does the shared edge touch our boundary corner?
    const fromEdge = cage.patches[fromPatchIdx].getEdgeVertices(a.side);
    if (fromEdge[0] !== corner && fromEdge[3] !== corner) continue;

    // Found a neighbor connected at the corner.
    // Now find which edge of that neighbor continues the boundary.
    const otherPatch = cage.patches[a.otherIdx];
    for (let s = 0; s < 4; s++) {
      if (s === a.otherSide) continue; // skip the shared adjacency edge itself
      const ev = otherPatch.getEdgeVertices(s);
      if (ev[0] === corner || ev[3] === corner) {
        visited.add(a.otherIdx);
        result.push({patchIdx: a.otherIdx, side: s});
        const nextCorner = ev[0] === corner ? ev[3] : ev[0];
        walkBoundary(cage, nextCorner, a.otherIdx, s, visited, result);
        return;
      }
    }
  }
}

/**
 * Mirror a single patch across the given plane.
 */
function mirrorSinglePatch(
  cage: PatchCage,
  patchIdx: number, side: number,
  planePoint: Vec3, planeNormal: Vec3,
): number {
  const patch = cage.patches[patchIdx];
  const edgeVerts = patch.getEdgeVertices(side);
  const srcGrid = patch.grid;
  const mirrorGrid: CageVertex[][] = [];
  const cpPairs: {source: CageVertex, mirror: CageVertex}[] = [];
  const edgeSet = new Set<CageVertex>(edgeVerts);

  for (let row = 0; row < 4; row++) {
    mirrorGrid[row] = [];
    for (let col = 0; col < 4; col++) {
      const srcV = srcGrid[row][col];
      if (edgeSet.has(srcV)) {
        mirrorGrid[row][col] = srcV;
      } else {
        const p = srcV.position;
        const d = vdot(vsub(p, planePoint), planeNormal);
        const rp: Vec3 = [
          p[0] - 2 * d * planeNormal[0],
          p[1] - 2 * d * planeNormal[1],
          p[2] - 2 * d * planeNormal[2],
        ];
        const mv = new CageVertex(rp[0], rp[1], rp[2]);
        mirrorGrid[row][col] = mv;
        cpPairs.push({source: srcV, mirror: mv});
      }
    }
  }

  // Flip grid so shared edge is on the correct side of the new patch
  let finalGrid: CageVertex[][];
  if (side === 0 || side === 2) {
    finalGrid = [mirrorGrid[3], mirrorGrid[2], mirrorGrid[1], mirrorGrid[0]];
  } else {
    finalGrid = mirrorGrid.map(row => [row[3], row[2], row[1], row[0]]);
  }

  const mp = new NurbsPatch(finalGrid);
  if (patch.rational) {
    mp.rational = true;
    if (side === 0 || side === 2) {
      mp.weights = [patch.weights[3].slice(), patch.weights[2].slice(), patch.weights[1].slice(), patch.weights[0].slice()];
    } else {
      mp.weights = patch.weights.map(row => [row[3], row[2], row[1], row[0]]);
    }
  }

  cage.patches.push(mp);
  const mirrorIdx = cage.patches.length - 1;

  cage.mirrorConstraints.push({
    sourcePatchIdx: patchIdx,
    mirrorPatchIdx: mirrorIdx,
    planePoint,
    planeNormal,
    cpPairs,
  });

  return mirrorIdx;
}

/**
 * After mirroring multiple patches, stitch shared edges between adjacent
 * mirror patches by replacing duplicate vertices with shared references.
 */
function stitchMirrorEdges(cage: PatchCage, mirrorIndices: number[]): void {
  if (mirrorIndices.length < 2) return;
  const EPS = 1e-8;

  for (let a = 0; a < mirrorIndices.length; a++) {
    for (let b = a + 1; b < mirrorIndices.length; b++) {
      const pA = cage.patches[mirrorIndices[a]];
      const pB = cage.patches[mirrorIndices[b]];

      // Check each edge pair for matching positions
      for (let sA = 0; sA < 4; sA++) {
        const eA = pA.getEdgeVertices(sA);
        for (let sB = 0; sB < 4; sB++) {
          const eB = pB.getEdgeVertices(sB);

          // Check forward match
          let fwd = true, rev = true;
          for (let i = 0; i < 4; i++) {
            if (vdist(eA[i].position, eB[i].position) > EPS) fwd = false;
            if (vdist(eA[i].position, eB[3-i].position) > EPS) rev = false;
          }
          if (!fwd && !rev) continue;

          // Replace B's vertices with A's vertices
          for (let i = 0; i < 4; i++) {
            const srcB = rev ? eB[3-i] : eB[i];
            const tgtA = eA[i];
            if (srcB === tgtA) continue;
            // Replace in grid
            for (let r = 0; r < 4; r++) {
              for (let c = 0; c < 4; c++) {
                if (pB.grid[r][c] === srcB) pB.grid[r][c] = tgtA;
              }
            }
            // Update mirror constraint cpPairs
            for (const mc of cage.mirrorConstraints) {
              for (const pair of mc.cpPairs) {
                if (pair.mirror === srcB) pair.mirror = tgtA;
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Enforce mirror constraints when a source vertex moves.
 * Cascades transitively: if a mirror target is itself a source
 * in another constraint, the update propagates down the chain.
 */
export function enforceMirrorConstraints(cage: PatchCage, v: CageVertex): void {
  const queue: CageVertex[] = [v];
  const processed = new Set<CageVertex>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (processed.has(current)) continue;
    processed.add(current);

    for (const mc of cage.mirrorConstraints) {
      for (const pair of mc.cpPairs) {
        if (pair.source === current) {
          const p = current.position;
          const d = vdot(vsub(p, mc.planePoint), mc.planeNormal);
          pair.mirror.set(
            p[0] - 2 * d * mc.planeNormal[0],
            p[1] - 2 * d * mc.planeNormal[1],
            p[2] - 2 * d * mc.planeNormal[2],
          );
          queue.push(pair.mirror);
        }
      }
    }
  }
}

/**
 * Enforce all mirror constraints (full refresh).
 * Runs multiple passes to handle chained mirrors.
 */
export function enforceAllMirrorConstraints(cage: PatchCage): void {
  // Collect all root sources (not themselves mirror targets)
  const mirrorTargets = new Set<CageVertex>();
  for (const mc of cage.mirrorConstraints) {
    for (const pair of mc.cpPairs) mirrorTargets.add(pair.mirror);
  }

  for (const mc of cage.mirrorConstraints) {
    for (const pair of mc.cpPairs) {
      if (!mirrorTargets.has(pair.source)) {
        // Root source — cascade from here
        enforceMirrorConstraints(cage, pair.source);
      }
    }
  }
}

/**
 * Check if a vertex is a read-only mirror target.
 */
export function isMirrorTarget(cage: PatchCage, v: CageVertex): boolean {
  for (const mc of cage.mirrorConstraints) {
    for (const pair of mc.cpPairs) {
      if (pair.mirror === v) return true;
    }
  }
  return false;
}

/**
 * Remove a mirror constraint and optionally delete the mirror patch.
 */
export function removeMirrorConstraint(cage: PatchCage, mc: MirrorConstraint, deletePatch: boolean = true): void {
  const idx = cage.mirrorConstraints.indexOf(mc);
  if (idx >= 0) cage.mirrorConstraints.splice(idx, 1);
  if (deletePatch) {
    const pi = cage.patches.indexOf(cage.patches[mc.mirrorPatchIdx]);
    if (pi >= 0) {
      cage.patches.splice(pi, 1);
      cage.notifySplice(pi, 1, 0);
      // Re-index all constraints that reference patches after the deleted one
      for (const m of cage.mirrorConstraints) {
        if (m.sourcePatchIdx > pi) m.sourcePatchIdx--;
        if (m.mirrorPatchIdx > pi) m.mirrorPatchIdx--;
      }
      for (const a of cage.arcConstraints) {
        if (a.patchSide && a.patchSide.patchIdx > pi) a.patchSide.patchIdx--;
      }
    }
  }
}
