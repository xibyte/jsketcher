import {PatchCage, CageVertex, NurbsPatch} from '../../models/Scene/PatchCageCore';
import {mul as vscale, lerp as vlerp} from 'math/vec';

/**
 * Extrude a patch: disconnect from neighbors, move along normal,
 * and create 4 wall patches to maintain watertightness.
 */
export function extrudePatch(cage: PatchCage, patchIdx: number, distance: number): void {
  const group = cage.findGroupOfPatch(patchIdx);
  const patch = cage.patches[patchIdx];
  const normal = patch.normal(0.5, 0.5);
  const offset = vscale(normal, distance);

  // Clone all vertices in the patch and move clones
  const cloneMap = new Map<CageVertex, CageVertex>();
  for (const row of patch.grid) {
    for (const v of row) {
      if (!cloneMap.has(v)) {
        cloneMap.set(v, new CageVertex(
          v.position[0] + offset[0], v.position[1] + offset[1], v.position[2] + offset[2]
        ));
      }
    }
  }

  // Save original edge vertices before replacing the grid
  const edges: [CageVertex, CageVertex, CageVertex, CageVertex][] = [];
  for (let side = 0; side < 4; side++) {
    edges.push([...patch.getEdgeVertices(side)] as [CageVertex, CageVertex, CageVertex, CageVertex]);
  }

  // Pre-compute corner interpolation vertices (shared between adjacent walls)
  const cornerVerts = [patch.grid[0][0], patch.grid[0][3], patch.grid[3][3], patch.grid[3][0]];
  const cornerMids: [CageVertex, CageVertex][] = cornerVerts.map(cv => {
    const nv = cloneMap.get(cv)!;
    const p1 = vlerp(cv.position, nv.position, 1 / 3);
    const p2 = vlerp(cv.position, nv.position, 2 / 3);
    return [new CageVertex(p1[0], p1[1], p1[2]), new CageVertex(p2[0], p2[1], p2[2])];
  });

  // Replace patch grid with cloned (moved) vertices
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      patch.grid[r][c] = cloneMap.get(patch.grid[r][c])!;
    }
  }

  // Corner index mapping per edge: [startCornerIdx, endCornerIdx]
  const edgeCornerMap: [number, number][] = [[0, 1], [1, 2], [3, 2], [0, 3]];

  // Create 4 wall patches
  for (let side = 0; side < 4; side++) {
    const oldEdge = edges[side];
    const newEdge = oldEdge.map(v => cloneMap.get(v)!) as [CageVertex, CageVertex, CageVertex, CageVertex];
    const [ci0, ci3] = edgeCornerMap[side];

    const wallGrid: CageVertex[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: CageVertex[] = [];
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
          row.push(new CageVertex(p[0], p[1], p[2]));
        }
      }
      wallGrid.push(row);
    }

    cage.patches.push(new NurbsPatch(wallGrid));
  }
  cage.notifyPush(4, group);
}
