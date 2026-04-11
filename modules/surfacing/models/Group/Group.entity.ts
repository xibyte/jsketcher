import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';

/**
 * A named collection of surfaces — typically the output of a primitive
 * (Box, Cylinder, Plane) or a CSG/op result. Holds direct NurbsSurface
 * references; no index gymnastics on splice/push.
 */
export class Group extends GeometricEntity {

  name: string;
  surfaces: NurbsSurface[] = [];

  constructor(name: string = '', id?: string) {
    super(id ?? generateEntityId('G'));
    this.name = name;
  }

  addSurface(surface: NurbsSurface): void {
    if (!this.surfaces.includes(surface)) this.surfaces.push(surface);
  }

  removeSurface(surface: NurbsSurface): void {
    const i = this.surfaces.indexOf(surface);
    if (i >= 0) this.surfaces.splice(i, 1);
  }

  hasSurface(surface: NurbsSurface): boolean {
    return this.surfaces.includes(surface);
  }
}
