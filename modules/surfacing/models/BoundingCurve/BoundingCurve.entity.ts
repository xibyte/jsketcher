import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';

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

  constructor(side: number, cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]) {
    super(generateEntityId('BC'));
    this.side = side;
    this.cp = cp;
  }

  /** Evaluate the cubic Bézier curve at parameter t */
  eval(t: number): Vec3 {
    const mt = 1 - t;
    const p0 = this.cp[0].vertex.position;
    const p1 = this.cp[1].vertex.position;
    const p2 = this.cp[2].vertex.position;
    const p3 = this.cp[3].vertex.position;
    return [
      mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
      mt*mt*mt*p0[2] + 3*mt*mt*t*p1[2] + 3*mt*t*t*p2[2] + t*t*t*p3[2],
    ];
  }
}
