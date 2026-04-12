import {Scene, Vertex, NurbsSurface} from '../../models/Scene/Scene.entity';
import {mul as vscale} from 'math/vec';

/**
 * Push/pull a surface along its normal. Moves all vertices including shared
 * boundary ones, so adjacent surfaces deform at shared edges.
 */
export function pushPull(scene: Scene, surface: NurbsSurface, distance: number): void {
  const normal = surface.normal(0.5, 0.5);
  const offset = vscale(normal, distance);

  const seen = new Set<Vertex>();
  for (const row of surface.grid) {
    for (const v of row) seen.add(v);
  }
  for (const v of seen) {
    v.set(v.position[0] + offset[0], v.position[1] + offset[1], v.position[2] + offset[2]);
  }
}
