import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import type {CurveTessPoint, BorderTessPoint, TessEdge} from '../../tessellation/types';
import type {SurfacingContext} from '../../SurfacingContext';
import {BoundingCurveObject3D} from './BoundingCurve.object3d';

export type ArcMode = 'approximate' | 'rational';

export interface ArcConstraintData {
  radius: number;
  /** Sweep angle in degrees */
  angle: number;
  /** Normal of the arc plane */
  planeNormal: Vec3;
  /** Center of the arc circle */
  center: Vec3;
  mode: ArcMode;
}

/**
 * An implicit cubic Bézier curve at the boundary of a NurbsSurface.
 * Cannot exist without a parent surface. Carries arc constraints.
 * The 4 control points are the SAME instances as the surface's edge CPs.
 *
 * side: 0=bottom (row 0), 1=right (col 3), 2=top (row 3), 3=left (col 0)
 */
export class BoundingCurve extends GeometricEntity {

  side: number;
  cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint];
  arcConstraint: ArcConstraintData | null = null;

  // -----------------------------------------------------------------------
  // Tessellation state (populated by tessellation/tessellateCurve.ts).
  //
  // The curve is sampled once — at a chosen reference surface's boundary
  // isoline — and the resulting CurveTessPoints are shared by every
  // surface that uses the curve. Each such surface gets its own entry in
  // `perSurface` holding BorderTessPoints in the surface's own edge
  // direction (reversed at build time if the surface walks the edge
  // vertices opposite to the reference surface).
  // -----------------------------------------------------------------------

  /** length = tessResolution + 1. Shared with adjacent surfaces. */
  samples: CurveTessPoint[] | null = null;
  /** Per adjacent surface: one BorderTessPoint per sample, in that surface's own edge direction. */
  perSurface: Map<NurbsSurface, BorderTessPoint[]> = new Map();
  /** Resolution at which `samples` was built (-1 if never tessellated). */
  tessResolution: number = -1;
  /** TessEdges along the curve (length = tessResolution). */
  edges: TessEdge[] = [];
  /**
   * `true` when a user surface's vertex moved and the interior `samples`
   * need resampling in place. tessellateCurve clears it after refreshing.
   * Set by NurbsSurface.invalidateVisual. Orthogonal to
   * `invalidateTessellation()` which wipes sample *instances*.
   */
  tessDirty: boolean = false;

  /**
   * Every NurbsSurface that currently references this curve on one of its
   * sides. Populated by Scene._wireBoundingCurves when surfaces are added
   * / removed. When the set becomes empty the curve is dropped from the
   * Scene registry.
   */
  users: Set<NurbsSurface> = new Set();

  constructor(ctx: SurfacingContext, side: number, cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]) {
    super(ctx, generateEntityId('BC'));
    this.side = side;
    this.cp = cp;
    this.object3d = new BoundingCurveObject3D(this, ctx.sceneSetup);
    ctx.workingGroup.add(this.object3d);
  }

  // -----------------------------------------------------------------------
  // Refcounted lifetime — add/removeUser keeps `users` in sync. When the
  // last user surface is removed the curve disposes itself (drops its
  // view, drops cached tessellation state).
  // -----------------------------------------------------------------------

  addUser(surface: NurbsSurface): void {
    this.users.add(surface);
  }

  removeUser(surface: NurbsSurface): void {
    this.users.delete(surface);
    this.perSurface.delete(surface);
    if (this.users.size === 0) this.dispose();
  }

  dispose(): void {
    if (this.object3d) {
      (this.object3d as any).parent?.remove(this.object3d);
      if (typeof (this.object3d as any).dispose === 'function') {
        (this.object3d as any).dispose();
      }
      this.object3d = null;
    }
    this.invalidateTessellation();
    super.dispose();
  }

  /** Drop cached tessellation state — call when an edge vertex moves. */
  invalidateTessellation(): void {
    this.samples = null;
    this.tessResolution = -1;
    this.perSurface.clear();
    this.edges = [];
  }

  /** Evaluate the cubic Bézier curve at parameter t */
  eval(t: number): Vec3 {
    const mt = 1 - t;
    const p0 = this.cp[0].position;
    const p1 = this.cp[1].position;
    const p2 = this.cp[2].position;
    const p3 = this.cp[3].position;
    return [
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
      mt*mt*mt*p0[2] + 3*mt*mt*t*p1[2] + 3*mt*t*t*p2[2] + t*t*t*p3[2],
    ];
  }
}
