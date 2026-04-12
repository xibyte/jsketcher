import {Scene, Vertex, NurbsSurface, MirrorConstraint, ArcConstraint} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {Vec3} from '../../patchCageTypes';
import {add as vadd, sub as vsub, mul as vscale, normalize as vnormalize, distance as vdist, cross as vcross, dot as vdot} from 'math/vec';

/**
 * Mirror all surfaces along the boundary that contains the given edge.
 * Computes the mirror plane from the selected edge, finds all surfaces
 * whose edge lies on that plane, and mirrors each one.
 * Returns all newly created mirror surfaces.
 */
export function mirrorAcrossEdge(scene: Scene, surface: NurbsSurface, side: number): NurbsSurface[] {
  const edgeVerts = surface.getEdgeVertices(side);

  // Build mirror plane from the selected edge
  const e0 = edgeVerts[0].position;
  const e3 = edgeVerts[3].position;
  const edgeDir = vnormalize(vsub(e3, e0));

  // Get surface normal at edge midpoint
  let u = 0.5, v = 0.5;
  if (side === 0) v = 0;
  else if (side === 1) u = 1;
  else if (side === 2) v = 1;
  else if (side === 3) u = 0;
  const surfNormal = surface.normal(u, v);

  // Plane normal = cross(edgeDir, surfNormal)
  const planeNormal = vnormalize(vcross(edgeDir, surfNormal));
  const planePoint: Vec3 = [...e0];

  // Walk adjacency graph to find all surfaces along the mirror boundary.
  const toMirror = traceMirrorBoundary(scene, surface, side);

  const result: NurbsSurface[] = [];
  for (const entry of toMirror) {
    result.push(mirrorSingleSurface(scene, entry.surface, entry.side, planePoint, planeNormal));
  }

  // Connect shared edges between adjacent mirror surfaces
  stitchMirrorEdges(scene, result);

  return result;
}

/**
 * Trace the mirror boundary by walking the adjacency graph from the
 * selected edge's corner vertices in both directions.
 */
function traceMirrorBoundary(scene: Scene, startSurface: NurbsSurface, startSide: number): {surface: NurbsSurface, side: number}[] {
  const result: {surface: NurbsSurface, side: number}[] = [{surface: startSurface, side: startSide}];
  const visited = new Set<NurbsSurface>();
  visited.add(startSurface);

  const startEdge = startSurface.getEdgeVertices(startSide);

  // Walk from each corner of the selected edge
  walkBoundary(scene, startEdge[0], startSurface, startSide, visited, result);
  walkBoundary(scene, startEdge[3], startSurface, startSide, visited, result);

  return result;
}

/**
 * Walk the boundary chain from a corner vertex through adjacent surfaces.
 * Uses shared vertex identity — no tolerances.
 */
function walkBoundary(
  scene: Scene,
  corner: Vertex,
  fromSurface: NurbsSurface,
  fromSide: number,
  visited: Set<NurbsSurface>,
  result: {surface: NurbsSurface, side: number}[],
): void {
  // Find adjacent surfaces of fromSurface that connect at this corner
  const adj = scene.findAdjacentSurfaces(fromSurface);
  for (const a of adj) {
    if (visited.has(a.other)) continue;

    // Does the shared edge touch our boundary corner?
    const fromEdge = fromSurface.getEdgeVertices(a.side);
    if (fromEdge[0] !== corner && fromEdge[3] !== corner) continue;

    // Found a neighbor connected at the corner.
    // Now find which edge of that neighbor continues the boundary.
    for (let s = 0; s < 4; s++) {
      if (s === a.otherSide) continue; // skip the shared adjacency edge itself
      const ev = a.other.getEdgeVertices(s);
      if (ev[0] === corner || ev[3] === corner) {
        visited.add(a.other);
        result.push({surface: a.other, side: s});
        const nextCorner = ev[0] === corner ? ev[3] : ev[0];
        walkBoundary(scene, nextCorner, a.other, s, visited, result);
        return;
      }
    }
  }
}

/**
 * Mirror a single patch across the given plane.
 */
function mirrorSingleSurface(
  scene: Scene,
  source: NurbsSurface, side: number,
  planePoint: Vec3, planeNormal: Vec3,
): NurbsSurface {
  const edgeVerts = source.getEdgeVertices(side);
  const srcGrid = source.grid;
  const mirrorGrid: ControlPoint[][] = [];
  const cpPairs: {source: Vertex, mirror: Vertex}[] = [];
  const edgeSet = new Set<Vertex>(edgeVerts);

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
        const mv = new ControlPoint(scene.ctx, rp[0], rp[1], rp[2]);
        mirrorGrid[row][col] = mv;
        cpPairs.push({source: srcV, mirror: mv});
      }
    }
  }

  // Flip grid so shared edge is on the correct side of the new patch
  let finalGrid: ControlPoint[][];
  if (side === 0 || side === 2) {
    finalGrid = [mirrorGrid[3], mirrorGrid[2], mirrorGrid[1], mirrorGrid[0]];
  } else {
    finalGrid = mirrorGrid.map(row => [row[3], row[2], row[1], row[0]]);
  }

  // If the source patch carries non-unit weights, mirror them onto the
  // new patch's ControlPoints. The shared-edge CPs already carry the
  // source's weights (same instance); this block writes only the free
  // side's weights.
  if (source.rational) {
    const src = source.getWeightsMatrix();
    let mirrorWeights: number[][];
    if (side === 0 || side === 2) {
      mirrorWeights = [src[3].slice(), src[2].slice(), src[1].slice(), src[0].slice()];
    } else {
      mirrorWeights = src.map(row => [row[3], row[2], row[1], row[0]]);
    }
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        finalGrid[r][c].weight.value = mirrorWeights[r][c];
      }
    }
  }

  // Reuse the source surface's curve on the shared edge: seed a local
  // cache with all 4 source curves — `curvesFor` will pick up the
  // matching one by edge identity and build fresh curves for the rest.
  const mirrorCurveCache = new LocalBoundingCurveCache();
  mirrorCurveCache.register(source.boundingCurves.bottom);
  mirrorCurveCache.register(source.boundingCurves.right);
  mirrorCurveCache.register(source.boundingCurves.top);
  mirrorCurveCache.register(source.boundingCurves.left);
  const mp = new NurbsSurface(
    scene.ctx, finalGrid, mirrorCurveCache.curvesFor(scene.ctx, finalGrid),
  );

  // Mirrored surface joins the source's surface set
  if (source.surfaceSet) {
    mp.surfaceSet = source.surfaceSet;
    source.surfaceSet.surfaces.add(mp);
  }

  // Add the mirror surface to the same group as its source.
  const sourceGroup = scene.findGroupOfSurface(source);
  (sourceGroup ?? scene).addChild(mp);

  scene.mirrorConstraints.push({
    source,
    mirror: mp,
    planePoint,
    planeNormal,
    cpPairs,
  });

  return mp;
}

/**
 * After mirroring multiple surfaces, stitch shared edges between adjacent
 * mirror surfaces by replacing duplicate vertices with shared references.
 */
function stitchMirrorEdges(scene: Scene, mirrors: NurbsSurface[]): void {
  if (mirrors.length < 2) return;
  const EPS = 1e-8;

  for (let a = 0; a < mirrors.length; a++) {
    for (let b = a + 1; b < mirrors.length; b++) {
      const pA = mirrors[a];
      const pB = mirrors[b];

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
            for (const mc of scene.mirrorConstraints) {
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
export function enforceMirrorConstraints(scene: Scene, v: Vertex): void {
  const queue: Vertex[] = [v];
  const processed = new Set<Vertex>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (processed.has(current)) continue;
    processed.add(current);

    for (const mc of scene.mirrorConstraints) {
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
export function enforceAllMirrorConstraints(scene: Scene): void {
  // Collect all root sources (not themselves mirror targets)
  const mirrorTargets = new Set<Vertex>();
  for (const mc of scene.mirrorConstraints) {
    for (const pair of mc.cpPairs) mirrorTargets.add(pair.mirror);
  }

  for (const mc of scene.mirrorConstraints) {
    for (const pair of mc.cpPairs) {
      if (!mirrorTargets.has(pair.source)) {
        // Root source — cascade from here
        enforceMirrorConstraints(scene, pair.source);
      }
    }
  }
}

/**
 * Check if a vertex is a read-only mirror target.
 */
export function isMirrorTarget(scene: Scene, v: Vertex): boolean {
  for (const mc of scene.mirrorConstraints) {
    for (const pair of mc.cpPairs) {
      if (pair.mirror === v) return true;
    }
  }
  return false;
}

/**
 * Remove a mirror constraint and optionally delete the mirror patch.
 */
export function removeMirrorConstraint(scene: Scene, mc: MirrorConstraint, deleteMirror: boolean = true): void {
  const idx = scene.mirrorConstraints.indexOf(mc);
  if (idx >= 0) scene.mirrorConstraints.splice(idx, 1);
  if (deleteMirror && mc.mirror) {
    mc.mirror.parent?.removeChild(mc.mirror);
    mc.mirror.dispose();
  }
}
