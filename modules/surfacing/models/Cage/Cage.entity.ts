import {GeometricEntity} from '../GeometricEntity';
import type {SurfacingEditor} from '../../SurfacingEditor';
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
export class Cage extends GeometricEntity<CageObject3D> {

  vertices: Vertex[];
  segments: Line[];

  constructor(ctx: SurfacingEditor, vertices: Vertex[], segments: Line[]) {
    super(ctx, ctx.nextId('CG'));
    this.vertices = vertices;
    this.segments = segments;
    this.object3d = new CageObject3D(this);
    ctx.workingGroup.add(this.object3d);
  }

  dispose(): void {
    this.disposeView();
    super.dispose();
  }
}
