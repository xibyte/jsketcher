import {Scene, NurbsSurface} from '../../models/Scene/Scene.entity';
import {ControlPoint} from '../../models/ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../../models/BoundingCurve/buildBoundingCurves';
import {lerp as vlerp} from 'math/vec';
import {applyG1AllSides} from '../continuity/continuity.command';

/**
 * Create a bridge surface between two edges.
 * Returns the newly created surface.
 */
export function bridgeSurface(
  scene: Scene,
  edge1Verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint],
  edge2Verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint],
  options: {flipped?: boolean, g1?: boolean, sourceSurface?: NurbsSurface} = {}
): NurbsSurface {
  let e2 = edge2Verts;
  if (options.flipped) {
    e2 = [e2[3], e2[2], e2[1], e2[0]];
  }

  // Build 4×4 grid: row 0 = edge1, row 3 = edge2, rows 1-2 interpolated
  const grid: ControlPoint[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: ControlPoint[] = [];
    for (let c = 0; c < 4; c++) {
      if (r === 0) {
        row.push(edge1Verts[c]); // shared by identity with source surface
      } else if (r === 3) {
        row.push(e2[c]); // shared by identity with target surface
      } else {
        const t = r / 3;
        const p = vlerp(edge1Verts[c].position, e2[c].position, t);
        row.push(new ControlPoint(scene.ctx, p[0], p[1], p[2]));
      }
    }
    grid.push(row);
  }

  // Seed a curve cache with every surface in the scene so any edge of
  // the bridge that happens to match an existing surface's side lands
  // on that surface's curve.
  const curveCache = new LocalBoundingCurveCache();
  for (const s of scene.surfaces) {
    curveCache.register(s.boundingCurves.bottom);
    curveCache.register(s.boundingCurves.right);
    curveCache.register(s.boundingCurves.top);
    curveCache.register(s.boundingCurves.left);
  }
  const bridge = new NurbsSurface(scene.ctx, grid, curveCache.curvesFor(scene.ctx, grid));
  // Bridge inherits the source surface's surface set
  const sourceSurface = options.sourceSurface;
  if (sourceSurface?.surfaceSet) {
    bridge.surfaceSet = sourceSurface.surfaceSet;
    sourceSurface.surfaceSet.surfaces.add(bridge);
  }
  (sourceSurface?.parent ?? scene).addChild(bridge);

  if (options.g1) {
    applyG1AllSides(bridge);
  }

  return bridge;
}
