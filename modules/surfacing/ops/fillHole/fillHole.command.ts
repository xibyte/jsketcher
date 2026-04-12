import {Scene, Vertex, NurbsSurface} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {lerp as vlerp} from 'math/vec';
import {makeGrid} from '../../patchCageHelpers';
import type {SurfacingEditor} from '../../SurfacingEditor';

/**
 * Trace a hole boundary starting from a free edge.
 * Follows free edges around by matching corner vertices.
 * Returns null if no closed loop found, or an array of edge descriptors forming the loop.
 */
export function traceHole(scene: Scene, startPatchIdx: number, startSide: number): {patchIdx: number, side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] | null {
  const freeEdges = scene.findFreeEdges();

  // Build lookup: corner vertex → free edges starting or ending at that vertex
  const edgeByStart = new Map<Vertex, typeof freeEdges>();
  for (const fe of freeEdges) {
    const start = fe.verts[0];
    if (!edgeByStart.has(start)) edgeByStart.set(start, []);
    edgeByStart.get(start)!.push(fe);
  }

  // Also index by end vertex (verts[3]), storing a reversed reference
  const edgeByEnd = new Map<Vertex, typeof freeEdges>();
  for (const fe of freeEdges) {
    const end = fe.verts[3];
    if (!edgeByEnd.has(end)) edgeByEnd.set(end, []);
    edgeByEnd.get(end)!.push(fe);
  }

  // Find the starting edge
  const startEdge = freeEdges.find(fe => fe.patchIdx === startPatchIdx && fe.side === startSide);
  if (!startEdge) return null;

  const loop: typeof freeEdges = [startEdge];
  const visited = new Set<string>();
  visited.add(`${startEdge.patchIdx}:${startEdge.side}`);

  let currentEnd = startEdge.verts[3];
  const targetStart = startEdge.verts[0];

  for (let iter = 0; iter < 20; iter++) {
    if (currentEnd === targetStart && loop.length >= 3) {
      return loop; // closed loop found
    }

    // Find next free edge that starts at currentEnd
    let found = false;
    const candidates = edgeByStart.get(currentEnd) || [];
    for (const fe of candidates) {
      const key = `${fe.patchIdx}:${fe.side}`;
      if (visited.has(key)) continue;
      visited.add(key);
      loop.push(fe);
      currentEnd = fe.verts[3];
      found = true;
      break;
    }
    if (found) continue;

    // Try edges ending at currentEnd (traverse them reversed)
    const revCandidates = edgeByEnd.get(currentEnd) || [];
    for (const fe of revCandidates) {
      const key = `${fe.patchIdx}:${fe.side}`;
      if (visited.has(key)) continue;
      visited.add(key);
      // Push reversed
      loop.push({
        patchIdx: fe.patchIdx,
        side: fe.side,
        verts: [fe.verts[3], fe.verts[2], fe.verts[1], fe.verts[0]],
      });
      currentEnd = fe.verts[0]; // reversed end
      found = true;
      break;
    }
    if (!found) return null; // dead end
  }
  return null;
}

function interpRow(ctx: SurfacingEditor, bottom: [Vertex, Vertex, Vertex, Vertex], top: Vertex[], t: number): [ControlPoint, ControlPoint] {
  const p1 = vlerp(bottom[1].position, top[1].position, t);
  const p2 = vlerp(bottom[2].position, top[2].position, t);
  return [new ControlPoint(ctx, p1[0], p1[1], p1[2]), new ControlPoint(ctx, p2[0], p2[1], p2[2])];
}

/**
 * Fill a hole defined by 3 or 4 free edges forming a closed loop.
 * For 4 edges: Coons patch using boundary curves.
 * For 3 edges: degenerate patch with one collapsed edge.
 */
export function fillHole(scene: Scene, loop: {patchIdx: number, side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[]): boolean {
  // Place fill in the group of the first edge's patch, and inherit its surface set
  const sourcePatch = scene.surfaces[loop[0].patchIdx];
  const group = sourcePatch ? scene.findGroupOfSurface(sourcePatch) : null;
  const sourceSet = sourcePatch?.surfaceSet || null;

  let fillPatch: NurbsSurface | null = null;

  // Seed a curve cache with every neighbor's full curve set so the new
  // fill patch's shared edges land on the same BoundingCurve instances
  // as the neighbors already hold.
  const curveCache = new LocalBoundingCurveCache();
  for (const entry of loop) {
    const neighbor = scene.surfaces[entry.patchIdx];
    if (!neighbor) continue;
    curveCache.register(neighbor.boundingCurves.bottom);
    curveCache.register(neighbor.boundingCurves.right);
    curveCache.register(neighbor.boundingCurves.top);
    curveCache.register(neighbor.boundingCurves.left);
  }

  if (loop.length === 4) {
    // Coons patch: bottom=loop[0], right=loop[1], top=loop[2] reversed, left=loop[3] reversed
    const bottom = loop[0].verts;
    const right = loop[1].verts;
    const top: [ControlPoint, ControlPoint, ControlPoint, ControlPoint] = [loop[2].verts[3], loop[2].verts[2], loop[2].verts[1], loop[2].verts[0]];
    const left: [ControlPoint, ControlPoint, ControlPoint, ControlPoint] = [loop[3].verts[3], loop[3].verts[2], loop[3].verts[1], loop[3].verts[0]];

    const grid = makeGrid(
      scene.ctx,
      [bottom[0], bottom[3], top[0], top[3]],
      {bottom, right, top, left}
    );
    fillPatch = new NurbsSurface(scene.ctx, grid, curveCache.curvesFor(scene.ctx, grid));
  } else if (loop.length === 3) {
    // Degenerate patch: collapse one edge to a single vertex (the apex)
    const bottom = loop[0].verts;
    const right = loop[1].verts;
    const leftRev: [ControlPoint, ControlPoint, ControlPoint, ControlPoint] = [loop[2].verts[3], loop[2].verts[2], loop[2].verts[1], loop[2].verts[0]];

    // The apex is right[3] which should equal leftRev[0] (= loop[2].verts[3])
    const apex = right[3];

    const grid: ControlPoint[][] = [
      // Row 0: bottom edge
      bottom,
      // Row 1: interpolated
      [leftRev[1], ...interpRow(scene.ctx, bottom, [apex, apex, apex, apex], 1/3), right[1]],
      // Row 2: interpolated
      [leftRev[2], ...interpRow(scene.ctx, bottom, [apex, apex, apex, apex], 2/3), right[2]],
      // Row 3: collapsed to apex
      [apex, apex, apex, apex],
    ];

    fillPatch = new NurbsSurface(scene.ctx, grid, curveCache.curvesFor(scene.ctx, grid));
  }

  if (!fillPatch) return false;

  if (sourceSet) {
    fillPatch.surfaceSet = sourceSet;
    sourceSet.surfaces.add(fillPatch);
  }
  scene.addSurface(fillPatch, group ?? undefined);
  return true;
}
