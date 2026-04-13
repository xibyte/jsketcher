import type {Vec3} from 'math/vec';

export type ArcMode = 'approximate' | 'rational';

/**
 * An arc constraint is stored as `BoundingCurve.constraints.arc`. The
 * owning curve provides the four control points via `curve.cp`; the
 * subscription keeps itself alive — on creation the op attaches a
 * listener to the scene's cp-change stream, on removal the op calls
 * `unsubscribe`.
 */
export interface ArcConstraint {
  radius: number;
  /** Sweep angle in degrees. */
  angle: number;
  planeNormal: Vec3;
  center: Vec3;
  mode: ArcMode;
  /** Detach this constraint's cp-change listener. */
  unsubscribe?: () => void;
}
