import type {Vec3} from 'math/vec';
import {normalize, sub, cross} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {BoundingCurve} from '../BoundingCurve/BoundingCurve.entity';
import {Cage} from '../Cage/Cage.entity';
import {Line} from '../Line/Line.entity';
import type {SurfaceSet} from '../../SurfaceSet';

export interface MirrorConstraintData {
  source: NurbsSurface;
  planePoint: Vec3;
  planeNormal: Vec3;
  cpPairs: {source: ControlPoint, mirror: ControlPoint}[];
}

/**
 * A single bicubic NURBS surface patch with a 4×4 grid of Vertex control points
 * and a 4×4 weights matrix. Replaces NurbsPatch.
 *
 * Watertightness: adjacent surfaces share the SAME Vertex instances along their
 * boundary — no duplication.
 *
 * Primary representation:
 *   - grid: Vertex[][]      (4×4 of Vertex, row=V, col=U)
 *   - weights: number[][]   (4×4 of weights, mutable)
 *
 * Derived (rebuilt via syncEntityGraph):
 *   - cp: ControlPoint[][]  (one per grid cell, vertex+weight Param)
 *   - boundingCurves        (4 BoundingCurve entities, share CP instances)
 *   - cage                  (Cage visualization entity)
 */
export class NurbsSurface extends GeometricEntity {

  /** 4×4 grid of Vertex (source of truth, mutable, shared across surfaces) */
  grid: Vertex[][];
  /** 4×4 weights (1.0 = Bézier, other = rational NURBS) */
  weights: number[][];
  rational: boolean;

  /** Derived: 4×4 ControlPoints rebuilt from grid+weights for entity tree */
  cp: ControlPoint[][];

  /** Derived: 4 boundary curves (SAME CP instances as the grid edges) */
  boundingCurves: {
    bottom: BoundingCurve;
    right: BoundingCurve;
    top: BoundingCurve;
    left: BoundingCurve;
  };

  /** Derived: cage visualization */
  cage: Cage;

  /** Mirror constraint (null if not a mirror) */
  mirrorOf: MirrorConstraintData | null = null;

  /** Logical grouping into a face. Shared by reference between adjacent surfaces. */
  surfaceSet: SurfaceSet | null = null;

  constructor(grid: Vertex[][], weights?: number[][]) {
    super(generateEntityId('S'));
    this.grid = grid;
    this.weights = weights || [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]];
    this.rational = !!weights;
    this.syncEntityGraph();
  }

  /** Rebuild ControlPoint/BoundingCurve/Cage from current grid + weights */
  syncEntityGraph(): void {
    // Clear previous children
    this.children = [];

    // Create fresh ControlPoints
    this.cp = this.grid.map((row, r) =>
      row.map((v, c) => new ControlPoint(v, this.weights[r][c]))
    );

    // Bounding curves share the SAME CP instances along edges
    const cp = this.cp;
    this.boundingCurves = {
      bottom: new BoundingCurve(0, [cp[0][0], cp[0][1], cp[0][2], cp[0][3]]),
      right:  new BoundingCurve(1, [cp[0][3], cp[1][3], cp[2][3], cp[3][3]]),
      top:    new BoundingCurve(2, [cp[3][0], cp[3][1], cp[3][2], cp[3][3]]),
      left:   new BoundingCurve(3, [cp[0][0], cp[1][0], cp[2][0], cp[3][0]]),
    };

    this.cage = buildCage(cp);

    this.addChild(this.boundingCurves.bottom);
    this.addChild(this.boundingCurves.right);
    this.addChild(this.boundingCurves.top);
    this.addChild(this.boundingCurves.left);
    this.addChild(this.cage);
  }

  /** Get the 4 vertices along a boundary edge. side: 0=bottom, 1=right, 2=top, 3=left */
  getEdgeVertices(side: number): [Vertex, Vertex, Vertex, Vertex] {
    const g = this.grid;
    switch (side) {
      case 0: return [g[0][0], g[0][1], g[0][2], g[0][3]];
      case 1: return [g[0][3], g[1][3], g[2][3], g[3][3]];
      case 2: return [g[3][0], g[3][1], g[3][2], g[3][3]];
      case 3: return [g[0][0], g[1][0], g[2][0], g[3][0]];
      default: return [g[0][0], g[0][1], g[0][2], g[0][3]];
    }
  }

  /** Get the 4 ControlPoints along a boundary edge */
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
        const w = bu[i] * bv[j] * this.weights[j][i];
        const p = this.grid[j][i].position;
        wx += w * p[0]; wy += w * p[1]; wz += w * p[2]; wsum += w;
      }
      return wsum > 0 ? [wx/wsum, wy/wsum, wz/wsum] : [0, 0, 0];
    }
    const r: Vec3 = [0, 0, 0];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const w = bu[i] * bv[j];
      const p = this.grid[j][i].position;
      r[0] += w * p[0]; r[1] += w * p[1]; r[2] += w * p[2];
    }
    return r;
  }

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

function buildCage(cp: ControlPoint[][]): Cage {
  const vertexSet = new Set<Vertex>();
  for (const row of cp) {
    for (const c of row) vertexSet.add(c.vertex);
  }

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
