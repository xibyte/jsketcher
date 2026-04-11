import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import type {SurfacingContext} from '../../SurfacingContext';
import {Vertex} from '../Vertex/Vertex.entity';
import {Line} from '../Line/Line.entity';
import {CageObject3D} from './Cage.object3d';

/**
 * Cage visualization entity: a set of vertices connected by line segments.
 * Used to display the 4×4 control point grid of a NurbsSurface.
 *
 * Owned end-to-end by its parent NurbsSurface — constructor creates the
 * CageObject3D view in `ctx.workingGroup`, `dispose()` tears it down.
 * The Cage itself is not shared; each surface has exactly one.
 */
export class Cage extends GeometricEntity {

  vertices: Vertex[];
  segments: Line[];

  constructor(ctx: SurfacingContext, vertices: Vertex[], segments: Line[]) {
    super(ctx, generateEntityId('CG'));
    this.vertices = vertices;
    this.segments = segments;
    this.object3d = new CageObject3D(this);
    ctx.workingGroup.add(this.object3d);
  }

  dispose(): void {
    if (this.object3d) {
      (this.object3d as any).parent?.remove(this.object3d);
      if (typeof (this.object3d as any).dispose === 'function') {
        (this.object3d as any).dispose();
      }
      this.object3d = null;
    }
    super.dispose();
  }
}
