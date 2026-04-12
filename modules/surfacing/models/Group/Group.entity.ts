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

  static create(ctx: SurfacingEditor, name: string, children: GeometricEntity[] = []): Group {
    const g = new Group(ctx, name);
    for (const c of children) g.addChild(c);
    return g;
  }

  /** All NurbsSurface descendants directly contained in this group. */
  get surfaces(): NurbsSurface[] {
    const out: NurbsSurface[] = [];
    for (const c of this.children) {
      if (c instanceof NurbsSurface) out.push(c);
    }
    return out;
  }

  /** When a Group becomes empty, detach it from its parent. */
  removeChild(child: GeometricEntity<any>): void {
    super.removeChild(child);
    if (this.children.length === 0 && this.parent) {
      this.parent.removeChild(this);
    }
  }

}
