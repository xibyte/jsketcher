import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';

/**
 * A logical grouping of surfaces that form a single semantic face.
 * Example: the 5 patches that compose a cylinder cap form one SurfaceSet
 * called "top". When rendering boundaries, edges shared between two
 * surfaces in the same set are hidden — only the set's outer boundary
 * is drawn.
 */
export class SurfaceSet extends GeometricEntity {

  name: string;
  surfaces: NurbsSurface[];

  constructor(name: string, surfaces: NurbsSurface[]) {
    super(generateEntityId('SS'));
    this.name = name;
    this.surfaces = surfaces;
  }
}
