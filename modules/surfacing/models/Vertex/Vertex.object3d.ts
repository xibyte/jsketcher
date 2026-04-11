import {EntityObject3D} from '../../three';

/**
 * Vertex has no standalone visual — its handle is rendered by the
 * ControlPoint that owns it. This empty stub exists so every entity has a
 * uniform EntityObject3D type and can be traversed generically.
 */
export class VertexObject3D extends EntityObject3D {
  isSelectable(): boolean { return false; }
}
