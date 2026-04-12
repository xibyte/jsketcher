import {Scene, Vertex, NurbsSurface} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {mul as vscale, lerp as vlerp} from 'math/vec';

/**
 * Extrude a patch: disconnect from neighbors, move along normal,
 * and create 4 wall patches to maintain watertightness.
 */
export function extrudePatch(scene: Scene, patchIdx: number, distance: number): void {
  const patch = scene.surfaces[patchIdx];
  const group = scene.findGroupOfSurface(patch);
  const normal = patch.normal(0.5, 0.5);
  const offset = vscale(normal, distance);

  // Clone all grid CPs and move clones along the normal
  const cloneMap = new Map<ControlPoint, ControlPoint>();
  for (const row of patch.grid) {
    for (const v of row) {
      if (!cloneMap.has(v)) {
        cloneMap.set(v, new ControlPoint(
          scene.ctx,
          v.position[0] + offset[0], v.position[1] + offset[1], v.position[2] + offset[2]
        ));
      }
    }
  }

  // Save original edge CPs before replacing the grid
  const edges: [ControlPoint, ControlPoint, ControlPoint, ControlPoint][] = [];
  for (let side = 0; side < 4; side++) {
    edges.push([...patch.getEdgeVertices(side)] as [ControlPoint, ControlPoint, ControlPoint, ControlPoint]);
  }

  // Pre-compute corner interpolation CPs (shared between adjacent walls)
  const cornerVerts = [patch.grid[0][0], patch.grid[0][3], patch.grid[3][3], patch.grid[3][0]];
  const cornerMids: [ControlPoint, ControlPoint][] = cornerVerts.map(cv => {
    const nv = cloneMap.get(cv)!;
    const p1 = vlerp(cv.position, nv.position, 1 / 3);
    const p2 = vlerp(cv.position, nv.position, 2 / 3);
    return [new ControlPoint(scene.ctx, p1[0], p1[1], p1[2]), new ControlPoint(scene.ctx, p2[0], p2[1], p2[2])];
  });

  // Replace the patch's grid with the cloned (moved) CPs AND build a
  // fresh set of curves for the new grid. The original patch's curves
  // still reference the stationary edge CPs — those curves now belong
  // to the wall patches (as their row=0 edge), reused below.
  const newPatchGrid: ControlPoint[][] = patch.grid.map(
    row => row.map(cp => cloneMap.get(cp)!),
  );

  // Seed a curve cache with the original patch's 4 curves, so each wall
  // patch picks them up as its "old side" edge, and share fresh walls'
  // internal seams via the same cache.
  const curveCache = new LocalBoundingCurveCache();
  curveCache.register(patch.boundingCurves.bottom);
  curveCache.register(patch.boundingCurves.right);
  curveCache.register(patch.boundingCurves.top);
  curveCache.register(patch.boundingCurves.left);

  // Corner index mapping per edge: [startCornerIdx, endCornerIdx]
  const edgeCornerMap: [number, number][] = [[0, 1], [1, 2], [3, 2], [0, 3]];

  // Create 4 wall patches
  const walls: NurbsSurface[] = [];
  for (let side = 0; side < 4; side++) {
    const oldEdge = edges[side];
    const newEdge = oldEdge.map(v => cloneMap.get(v)!) as [ControlPoint, ControlPoint, ControlPoint, ControlPoint];
    const [ci0, ci3] = edgeCornerMap[side];

    const wallGrid: ControlPoint[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: ControlPoint[] = [];
      for (let c = 0; c < 4; c++) {
        if (r === 0) {
          row.push(oldEdge[c]);
        } else if (r === 3) {
          row.push(newEdge[c]);
        } else if (c === 0) {
          row.push(cornerMids[ci0][r - 1]);
        } else if (c === 3) {
          row.push(cornerMids[ci3][r - 1]);
        } else {
          const p = vlerp(oldEdge[c].position, newEdge[c].position, r / 3);
          row.push(new ControlPoint(scene.ctx, p[0], p[1], p[2]));
        }
      }
      wallGrid.push(row);
    }

    const wallPatch = new NurbsSurface(
      scene.ctx, wallGrid, curveCache.curvesFor(scene.ctx, wallGrid),
    );
    // Walls inherit the source patch's surface set
    if (patch.surfaceSet) {
      wallPatch.surfaceSet = patch.surfaceSet;
      patch.surfaceSet.surfaces.add(wallPatch);
    }
    walls.push(wallPatch);
  }

  // Retarget the moved patch onto the new grid + fresh top curves. Its
  // old curves (registered with walls[*].row 0 earlier) are now owned
  // by those walls. The moved patch gets 4 brand-new curves over the
  // cloned top-row CPs.
  patch.updateGrid(newPatchGrid, curveCache.curvesFor(scene.ctx, newPatchGrid));

  const parent = group ?? scene;
  for (const w of walls) parent.addChild(w);
}
