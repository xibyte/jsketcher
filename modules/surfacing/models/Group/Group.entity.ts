import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import type {SurfacingContext} from '../../SurfacingContext';

/**
 * A named collection of entities — typically a primitive's output (Box,
 * Cylinder, Plane) or an op result. The group's `children` ARE its
 * contents; there is no parallel surfaces[] field. `surfaces` is a getter
 * that filters children for NurbsSurface instances.
 */
export class Group extends GeometricEntity {

  name: string;

  constructor(ctx: SurfacingContext, name: string = '', id?: string) {
    super(ctx, id ?? generateEntityId('G'));
    this.name = name;
  }

  /** All NurbsSurface descendants directly contained in this group. */
  get surfaces(): NurbsSurface[] {
    const out: NurbsSurface[] = [];
    for (const c of this.children) {
      if (c instanceof NurbsSurface) out.push(c);
    }
    return out;
  }

  addSurface(surface: NurbsSurface): void {
    this.addChild(surface);
  }

  removeSurface(surface: NurbsSurface): void {
    this.removeChild(surface);
  }

  hasSurface(surface: NurbsSurface): boolean {
    return this.children.includes(surface);
  }
}
