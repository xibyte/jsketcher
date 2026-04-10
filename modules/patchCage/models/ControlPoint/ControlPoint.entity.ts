import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {Vertex} from '../Vertex/Vertex.entity';
import {Param} from '../Param';

/**
 * A NURBS control point: a Vertex position combined with a scalar weight.
 * Multiple surfaces can share the same ControlPoint instance at boundaries.
 */
export class ControlPoint extends GeometricEntity {

  vertex: Vertex;
  weight: Param;

  constructor(vertex: Vertex, weight: number = 1.0) {
    super(generateEntityId('CP'));
    this.vertex = vertex;
    this.weight = new Param(weight);
    this.addChild(vertex);
  }
}
