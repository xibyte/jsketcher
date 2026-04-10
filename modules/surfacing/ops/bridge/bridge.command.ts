import {PatchCage, CageVertex, NurbsPatch} from '../../models/Scene/Scene.entity';
import {lerp as vlerp} from 'math/vec';
import {applyG1AllSides} from '../continuity/continuity.command';

/**
 * Create a bridge surface between two edges.
 * Returns the index of the newly created patch.
 */
export function bridgeSurface(
  cage: PatchCage,
  edge1Verts: [CageVertex, CageVertex, CageVertex, CageVertex],
  edge2Verts: [CageVertex, CageVertex, CageVertex, CageVertex],
  options: {flipped?: boolean, g1?: boolean, sourcePatchIdx?: number} = {}
): number {
  let e2 = edge2Verts;
  if (options.flipped) {
    e2 = [e2[3], e2[2], e2[1], e2[0]];
  }

  // Build 4×4 grid: row 0 = edge1, row 3 = edge2, rows 1-2 interpolated
  const grid: CageVertex[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: CageVertex[] = [];
    for (let c = 0; c < 4; c++) {
      if (r === 0) {
        row.push(edge1Verts[c]); // shared by identity with source patch
      } else if (r === 3) {
        row.push(e2[c]); // shared by identity with target patch
      } else {
        const t = r / 3;
        const p = vlerp(edge1Verts[c].position, e2[c].position, t);
        row.push(new CageVertex(p[0], p[1], p[2]));
      }
    }
    grid.push(row);
  }

  const bridgePatch = new NurbsPatch(grid);
  // Bridge inherits the source patch's surface set
  if (options.sourcePatchIdx !== undefined) {
    const sourceSet = cage.patches[options.sourcePatchIdx]?.surfaceSet;
    if (sourceSet) sourceSet.add(bridgePatch);
  }
  cage.patches.push(bridgePatch);
  const group = options.sourcePatchIdx !== undefined ? cage.findGroupOfPatch(options.sourcePatchIdx) : null;
  cage.notifyPush(1, group);
  const newIdx = cage.patches.length - 1;

  if (options.g1) {
    applyG1AllSides(cage, newIdx);
  }

  return newIdx;
}
