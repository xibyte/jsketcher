import {Scene, Vertex, ArcConstraint, ArcMode} from '../../models/Scene/Scene.entity';
import type {NurbsSurface} from '../../models/NurbsSurface/NurbsSurface.entity';
import {Vec3} from '../../patchCageTypes';
import {add as vadd, sub as vsub, mul as vscale, lerp as vlerp, normalize as vnormalize, distance as vdist, cross as vcross, dot as vdot} from 'math/vec';

/**
 * Constrain an edge to a circular arc.
 */
export function constrainEdgeToArc(
  scene: Scene, surface: NurbsSurface, side: number,
  radius: number, angle: number,
  planeNormal: Vec3, mode: ArcMode = 'approximate'
): ArcConstraint {
  const verts = surface.getEdgeVertices(side);

  const p0 = verts[0].position;
  const p3 = verts[3].position;
  const center = computeArcCenter(p0, p3, radius, angle, planeNormal);

  const constraint: ArcConstraint = {
    vertices: verts,
    radius, angle, planeNormal, center, mode,
    surfaceSide: {surface, side},
  };

  scene.arcConstraints.push(constraint);
  applyArcConstraint(scene, constraint);
  return constraint;
}

/**
 * Apply an arc constraint: reposition interior control points.
 * For rational mode, also set weights on the patch.
 */
export function applyArcConstraint(scene: Scene, c: ArcConstraint): void {
  const [v0, v1, v2, v3] = c.vertices;
  const p0 = v0.position, p3 = v3.position;
  const angleRad = (c.angle * Math.PI) / 180;

  // k = handle distance ratio for cubic Bézier circle approximation
  const k = (4 / 3) * Math.tan(angleRad / 4);

  // Radial directions from center to endpoints
  const r0 = vnormalize(vsub(p0, c.center));
  const r3 = vnormalize(vsub(p3, c.center));

  // Tangent at each endpoint = perpendicular to radius, in the arc plane
  const t0 = vnormalize(vcross(c.planeNormal, r0));
  const t3 = vnormalize(vcross(c.planeNormal, r3));

  // Ensure tangent directions point along the arc (from p0 toward p3)
  const chord = vsub(p3, p0);
  if (vdot(t0, chord) < 0) { t0[0] = -t0[0]; t0[1] = -t0[1]; t0[2] = -t0[2]; }
  if (vdot(t3, chord) > 0) { t3[0] = -t3[0]; t3[1] = -t3[1]; t3[2] = -t3[2]; }

  const handleLen = k * c.radius;

  v1.set(
    p0[0] + t0[0] * handleLen,
    p0[1] + t0[1] * handleLen,
    p0[2] + t0[2] * handleLen
  );
  v2.set(
    p3[0] + t3[0] * handleLen,
    p3[1] + t3[1] * handleLen,
    p3[2] + t3[2] * handleLen
  );

  if (c.mode === 'approximate') {
    if (c.surfaceSide) {
      setEdgeWeights(c.surfaceSide.surface, c.surfaceSide.side, [1, 1, 1, 1]);
    }
  } else {
    // Rational: set weights for exact arc
    const wMid = Math.cos(angleRad / 4);
    if (c.surfaceSide) {
      setEdgeWeights(c.surfaceSide.surface, c.surfaceSide.side, [1, wMid, wMid, 1]);
      // rational is now a derived getter — no need to flip a flag.
    }
  }
}

/** Re-enforce arc constraints that involve a given vertex */
export function enforceArcConstraints(scene: Scene, v: Vertex): void {
  for (const c of scene.arcConstraints) {
    // Only re-apply if an endpoint moved (interior points are computed)
    if (c.vertices[0] === v || c.vertices[3] === v) {
      // Recompute center from new endpoint positions
      c.center = computeArcCenter(
        c.vertices[0].position, c.vertices[3].position,
        c.radius, c.angle, c.planeNormal
      );
      applyArcConstraint(scene, c);
    }
  }
}

/** Set weights on the 4 ControlPoints along a surface edge. */
function setEdgeWeights(surface: NurbsSurface, side: number, weights: [number, number, number, number]): void {
  const edgeCPs = surface.getEdgeVertices(side);
  for (let i = 0; i < 4; i++) edgeCPs[i].weight.value = weights[i];
}

/** Remove an arc constraint */
export function removeArcConstraint(scene: Scene, constraint: ArcConstraint): void {
  const idx = scene.arcConstraints.indexOf(constraint);
  if (idx >= 0) {
    scene.arcConstraints.splice(idx, 1);
    // Reset weights if rational
    if (constraint.mode === 'rational' && constraint.surfaceSide) {
      setEdgeWeights(constraint.surfaceSide.surface, constraint.surfaceSide.side, [1, 1, 1, 1]);
      // `rational` is now a derived getter — no flag to update.
    }
  }
}

/**
 * Compute the center of a circular arc given two endpoints, radius, angle, and plane normal.
 */
export function computeArcCenter(p0: Vec3, p3: Vec3, radius: number, angleDeg: number, planeNormal: Vec3): Vec3 {
  const mid = vlerp(p0, p3, 0.5);
  const chord = vsub(p3, p0);
  const chordLen = vdist(p0, p3);

  // Direction from midpoint to center: perpendicular to chord, in the arc plane
  const chordDir = vnormalize(chord);
  const perpDir = vnormalize(vcross(planeNormal, chordDir));

  // Distance from chord midpoint to center
  const halfChord = chordLen / 2;
  const angleRad = (angleDeg * Math.PI) / 180;
  // For a circular arc: halfChord = radius * sin(angle/2)
  // So: d = sqrt(radius² - halfChord²) = radius * cos(angle/2)
  const d = radius * Math.cos(angleRad / 2);

  // Center is at midpoint + d * perpDir (or - depending on arc direction)
  return vadd(mid, vscale(perpDir, -d));
}
