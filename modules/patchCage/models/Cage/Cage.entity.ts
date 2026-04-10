import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {Vertex} from '../Vertex/Vertex.entity';
import {Line} from '../Line/Line.entity';

/**
 * Cage visualization entity: a set of vertices connected by line segments.
 * Used to display the 4×4 control point grid of a NurbsSurface.
 */
export class Cage extends GeometricEntity {

  vertices: Vertex[];
  segments: Line[];

  constructor(vertices: Vertex[], segments: Line[]) {
    super(generateEntityId('CG'));
    this.vertices = vertices;
    this.segments = segments;
  }
}
