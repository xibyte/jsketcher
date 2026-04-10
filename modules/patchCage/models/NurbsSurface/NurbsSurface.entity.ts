import type {Vec3} from 'math/vec';
import {normalize, sub, cross} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {BoundingCurve} from '../BoundingCurve/BoundingCurve.entity';
import {Cage} from '../Cage/Cage.entity';
import {Line} from '../Line/Line.entity';

export interface MirrorConstraintData {
  source: NurbsSurface;
  planePoint: Vec3;
  planeNormal: Vec3;
  cpPairs: {source: ControlPoint, mirror: ControlPoint}[];
}

/**
 * A single bicubic NURBS surface patch with 4×4 control points.
 * Replaces NurbsPatch + part of PatchCage.
 *
 * Watertightness: adjacent surfaces share the SAME ControlPoint instances
 * along their boundary — no duplication, no synchronization needed.
 */
export class NurbsSurface extends GeometricEntity {

  /** 4×4 grid of ControlPoints. grid[row][col], row=V, col=U */
  cp: ControlPoint[][];
  rational: boolean;

  /** 4 boundary curves (SAME CP instances as the grid edges) */
  boundingCurves: {
    bottom: BoundingCurve;  // side 0: row 0
    right: BoundingCurve;   // side 1: col 3
    top: BoundingCurve;     // side 2: row 3
    left: BoundingCurve;    // side 3: col 0
  };

  /** Cage visualization */
  cage: Cage;

  /** Mirror constraint (null if not a mirror) */
  mirrorOf: MirrorConstraintData | null = null;

  constructor(cp: ControlPoint[][]) {
    super(generateEntityId('S'));
    this.cp = cp;
    this.rational = cp.some(row => row.some(c => c.weight.value !== 1));

    // Create bounding curves sharing the SAME CP instances
    this.boundingCurves = {
      bottom: new BoundingCurve(0, [cp[0][0], cp[0][1], cp[0][2], cp[0][3]]),
      right:  new BoundingCurve(1, [cp[0][3], cp[1][3], cp[2][3], cp[3][3]]),
      top:    new BoundingCurve(2, [cp[3][0], cp[3][1], cp[3][2], cp[3][3]]),
      left:   new BoundingCurve(3, [cp[0][0], cp[1][0], cp[2][0], cp[3][0]]),
    };

    // Build cage from control points
    this.cage = buildCage(cp);

    // Register children
    this.addChild(this.boundingCurves.bottom);
    this.addChild(this.boundingCurves.right);
    this.addChild(this.boundingCurves.top);
    this.addChild(this.boundingCurves.left);
    this.addChild(this.cage);
  }

  /** Get the 4 CPs along a boundary edge. side: 0=bottom, 1=right, 2=top, 3=left */
  getEdgeCPs(side: number): [ControlPoint, ControlPoint, ControlPoint, ControlPoint] {
    return this.getBoundingCurve(side).cp;
  }

  getBoundingCurve(side: number): BoundingCurve {
    switch (side) {
      case 0: return this.boundingCurves.bottom;
      case 1: return this.boundingCurves.right;
      case 2: return this.boundingCurves.top;
      case 3: return this.boundingCurves.left;
      default: return this.boundingCurves.bottom;
    }
  }

  /** Evaluate surface point at (u, v) using Bernstein basis */
  eval(u: number, v: number): Vec3 {
    const bu = bernstein3(u), bv = bernstein3(v);
    if (this.rational) {
      let wx = 0, wy = 0, wz = 0, wsum = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const w = bu[i] * bv[j] * this.cp[j][i].weight.value;
        const p = this.cp[j][i].vertex.position;
        wx += w * p[0]; wy += w * p[1]; wz += w * p[2]; wsum += w;
      }
      return wsum > 0 ? [wx/wsum, wy/wsum, wz/wsum] : [0, 0, 0];
    }
    const r: Vec3 = [0, 0, 0];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const w = bu[i] * bv[j];
      const p = this.cp[j][i].vertex.position;
      r[0] += w * p[0]; r[1] += w * p[1]; r[2] += w * p[2];
    }
    return r;
  }

  /** Compute surface normal at (u, v) via finite differences */
  normal(u: number, v: number): Vec3 {
    const eps = 1e-5;
    const du = sub(
      this.eval(Math.min(1, u + eps), v),
      this.eval(Math.max(0, u - eps), v)
    );
    const dv = sub(
      this.eval(u, Math.min(1, v + eps)),
      this.eval(u, Math.max(0, v - eps))
    );
    return normalize(cross(du, dv)) as Vec3;
  }

  /** Tessellate this surface into a triangle mesh */
  tessellate(resolution: number = 8): {
    positions: number[], normals: number[], indices: number[]
  } {
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    const n = resolution;

    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const p = this.eval(i / n, j / n);
      const nm = this.normal(i / n, j / n);
      positions.push(p[0], p[1], p[2]);
      normals.push(nm[0], nm[1], nm[2]);
    }

    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + (n + 1), d = c + 1;
      indices.push(a, b, d, a, d, c);
    }

    return {positions, normals, indices};
  }
}

// =========================================================================
// Helpers
// =========================================================================

function bernstein3(t: number): [number, number, number, number] {
  const mt = 1 - t;
  return [mt * mt * mt, 3 * mt * mt * t, 3 * mt * t * t, t * t * t];
}

/** Build a Cage entity from a 4×4 CP grid */
function buildCage(cp: ControlPoint[][]): Cage {
  // Collect unique vertices
  const vertexSet = new Set<Vertex>();
  for (const row of cp) {
    for (const c of row) vertexSet.add(c.vertex);
  }

  // Build grid line segments (horizontal + vertical)
  const segments: Line[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      segments.push(new Line(cp[row][col], cp[row][col + 1]));
    }
  }
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) {
      segments.push(new Line(cp[row][col], cp[row + 1][col]));
    }
  }

  return new Cage(Array.from(vertexSet), segments);
}
