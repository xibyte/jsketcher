import {GeometricEntity} from '../GeometricEntity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import type {SurfacingEditor} from '../../SurfacingEditor';

/**
 * A named collection of entities — typically a primitive's output (Box,
 * Cylinder, Plane) or an op result. The group's `children` ARE its
 * contents; there is no parallel surfaces[] field. `surfaces` is a getter
 * that filters children for NurbsSurface instances.
 */
export class Group extends GeometricEntity {

  name: string;

  constructor(ctx: SurfacingEditor, name: string = '', id?: string) {
    super(ctx, id ?? ctx.nextId('G'));
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
