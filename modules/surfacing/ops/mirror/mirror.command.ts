import {Scene, Vertex, NurbsSurface} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {Vec3} from '../../patchCageTypes';
import {sub as vsub, normalize as vnormalize, distance as vdist, cross as vcross, dot as vdot} from 'math/vec';
import type {MirrorConstraint} from './mirror.types';

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
  const adj = fromSurface.findAdjacentSurfaces();
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
        mv.setMirrorTarget(true);
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

  // Add the mirror surface as a sibling of its source.
  (source.parent ?? scene).addChild(mp);

  scene.addMirrorConstraint({
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
            // Update mirror constraint cpPairs; the replacement target
            // inherits the mirror-target flag from the replaced vertex.
            let wasTarget = false;
            for (const mc of scene.globalConstraints.mirror) {
              for (const pair of mc.cpPairs) {
                if (pair.mirror === srcB) {
                  pair.mirror = tgtA;
                  wasTarget = true;
                }
              }
            }
            if (wasTarget) tgtA.setMirrorTarget(true);
          }
        }
      }
    }
  }
}

/**
 * Detach a mirror constraint and optionally dispose the mirrored
 * surface. Scene owns the bookkeeping (listener unsubscribe, array
 * splice, mirror-target flag cleanup) — this function is just a thin
 * wrapper that adds the surface-disposal step callers usually want.
 */
export function removeMirrorConstraint(scene: Scene, mc: MirrorConstraint, deleteMirror: boolean = true): void {
  scene.removeMirrorConstraint(mc);
  if (deleteMirror && mc.mirror) {
    mc.mirror.parent?.removeChild(mc.mirror);
    mc.mirror.dispose();
  }
}
