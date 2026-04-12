import {Vertex} from '../Vertex/Vertex.entity';
import {Param} from '../Param';
import type {SurfacingEditor} from '../../SurfacingEditor';

/**
 * A NURBS control point: a Vertex with a scalar weight.
 *
 * `ControlPoint extends Vertex`, so every CP IS a Vertex — it inherits
 * the position, the lazy draggable handle, hover/select API, and the
 * `usedBy` back-reference to surfaces. The extra thing a CP carries on
 * top of a plain Vertex is `weight`, which the NURBS evaluator reads
 * during `NurbsSurface.eval()`.
 *
 * Because a CP and a Vertex are the SAME entity, a grid cell of a
 * NurbsSurface is just a ControlPoint, not a Vertex-paired-with-a-CP.
 * Shared edges between adjacent surfaces automatically agree on
 * weights, because they share the same CP instance.
 */
export class ControlPoint extends Vertex {

  weight: Param;

  constructor(
    ctx: SurfacingEditor,
    x: number,
    y: number,
    z: number,
    weight: number = 1.0,
    id?: string,
  ) {
    super(ctx, x, y, z, id);
    this.weight = new Param(weight);
  }
}
