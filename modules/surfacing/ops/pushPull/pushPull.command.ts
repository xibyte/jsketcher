import {Scene, Vertex} from '../../models/Scene/Scene.entity';
import {mul as vscale} from 'math/vec';

/**
 * Push/pull a patch along its normal. Moves all vertices including shared
 * boundary ones, so adjacent patches deform at shared edges.
 */
export function pushPullPatch(scene: Scene, patchIdx: number, distance: number): void {
  const patch = scene.surfaces[patchIdx];
  const normal = patch.normal(0.5, 0.5);
  const offset = vscale(normal, distance);

  const seen = new Set<Vertex>();
  for (const row of patch.grid) {
    for (const v of row) seen.add(v);
  }
  for (const v of seen) {
    v.set(v.position[0] + offset[0], v.position[1] + offset[1], v.position[2] + offset[2]);
  }
}
