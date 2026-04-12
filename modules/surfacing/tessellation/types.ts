/**
 * Tessellation data structures for the surfacing module.
 *
 * The goal is a watertight mesh where adjacent surfaces on a shared
 * BoundingCurve use identical positions along the boundary — without
 * blurring per-surface normals at creases.
 *
 * Point types
 * -----------
 *   - TessPoint        interior sample of one surface (uv, xyz, normal).
 *   - BorderTessPoint  sample on one surface's side of a shared curve:
 *                      carries the surface's own uv + normal, but xyz is a
 *                      getter that forwards to a CurveTessPoint. Every
 *                      adjacent surface has its own BorderTessPoint at the
 *                      same curve sample.
 *   - CurveTessPoint   the shared xyz of a sample along a BoundingCurve.
 *                      Two surfaces sharing the curve see the same instance,
 *                      so their boundary positions are literally equal.
 *                      Corner CurveTessPoints are additionally shared
 *                      between every BoundingCurve that meets at a corner
 *                      Vertex (anchored via Vertex.cornerTessPoint).
 *
 * Topology
 * --------
 *   - TessEdge         a graph edge between two sample points. For edges
 *                      along a shared curve the edge is SINGLE — its
 *                      `endpoints` map holds one entry per adjacent surface,
 *                      each entry giving that surface's own BorderTessPoint
 *                      pair. `triangles[]` holds every triangle that
 *                      references this edge, so splitting the edge later
 *                      can propagate across both surfaces in one operation.
 *   - Triangle         a triangular face of one surface's tessellation.
 *                      Stores its 3 ordered `edges[]`; corner point lookups
 *                      walk the ring on demand. The triangle shape makes
 *                      adaptive subdivision trivial — splitting one edge
 *                      yields two smaller triangles by just re-wiring the
 *                      incident triangles' edge rings.
 *
 * This file intentionally knows nothing about how a surface actually builds
 * its tessellation — only the data shape. `tessellateCurve` /
 * `tessellateSurface` own the construction logic.
 */
import type {Vec3} from 'math/vec';
import type {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';

/** 2D parameter-space coordinate (u, v). */
export type Vec2 = [number, number];

// =========================================================================
// Points
// =========================================================================

/**
 * Shared xyz sample along a BoundingCurve. Positions match exactly between
 * adjacent surfaces because both see the same instance via their
 * BorderTessPoints' `curvePoint` reference.
 *
 * Corner CurveTessPoints are anchored on Vertex.cornerTessPoint: any
 * BoundingCurve that meets at that vertex uses the same instance as its
 * start/end sample, so adaptive splits at corners stay topologically
 * coherent across neighbouring curves.
 */
export class CurveTessPoint {
  xyz: Vec3;

  constructor(xyz: Vec3) {
    this.xyz = xyz;
  }
}

/**
 * A boundary sample belonging to one surface's tessellation. Stores the
 * surface-local uv and normal; xyz is borrowed from a shared CurveTessPoint
 * via a getter, so adjacent surfaces stay watertight while still allowing
 * creases (independent normals on either side of the boundary).
 */
export class BorderTessPoint {
  uv: Vec2;
  normal: Vec3;
  curvePoint: CurveTessPoint;

  constructor(uv: Vec2, normal: Vec3, curvePoint: CurveTessPoint) {
    this.uv = uv;
    this.normal = normal;
    this.curvePoint = curvePoint;
  }

  /** Forwarded from the shared CurveTessPoint. Read-only on purpose. */
  get xyz(): Vec3 {
    return this.curvePoint.xyz;
  }
}

/**
 * An interior sample of one surface's tessellation. Interior samples are
 * not shared with anything and carry their own xyz.
 */
export class TessPoint {
  uv: Vec2;
  xyz: Vec3;
  normal: Vec3;

  constructor(uv: Vec2, xyz: Vec3, normal: Vec3) {
    this.uv = uv;
    this.xyz = xyz;
    this.normal = normal;
  }
}

/** Either kind of point that a TessEdge can connect. */
export type AnyTessPoint = TessPoint | BorderTessPoint;

/**
 * The complete tessellation state for one BoundingCurve. Stored on the
 * entity as `curve.tessellation`.
 */
export interface CurveTessellation {
  resolution: number;
  samples: CurveTessPoint[];
  perSurface: Map<NurbsSurface, BorderTessPoint[]>;
  edges: TessEdge[];
}

// =========================================================================
// Topology
// =========================================================================

/**
 * An edge in the tessellation graph.
 *
 * For interior edges the `endpoints` map has exactly one entry: the owning
 * surface and its two endpoint points (TessPoints or BorderTessPoints).
 *
 * For edges along a shared BoundingCurve the map has TWO entries — one per
 * adjacent surface. Each entry provides that surface's own BorderTessPoints
 * at the two curve samples, so when a triangle from surface A walks this
 * edge it sees A's BorderTessPoints (with A's uv + normal), and when a
 * triangle from surface B walks it sees B's. Positions agree because both
 * surfaces' BorderTessPoints forward xyz to the same CurveTessPoints.
 *
 * `triangles[]` holds every triangle that references this edge. Splitting
 * a shared edge propagates across surfaces automatically because it IS
 * one object.
 */
export class TessEdge {
  endpoints: Map<NurbsSurface, readonly [AnyTessPoint, AnyTessPoint]> = new Map();
  triangles: Triangle[] = [];

  /** Convenience constructor for an edge owned by a single surface. */
  static interior(surface: NurbsSurface, a: AnyTessPoint, b: AnyTessPoint): TessEdge {
    const e = new TessEdge();
    e.endpoints.set(surface, [a, b] as const);
    return e;
  }
}

/**
 * A triangular face of one surface's tessellation.
 *
 * Every triangle belongs to exactly one surface (its `surface` field) —
 * this is how it resolves per-surface endpoints on edges that happen to
 * be shared with another surface. Corner lookups chain the edge ring so
 * we don't cache points: adaptive split only has to mutate edges to
 * subdivide a triangle, and corner walks keep working without extra
 * bookkeeping.
 */
export class Triangle {
  surface: NurbsSurface;
  edges: TessEdge[] = [];

  constructor(surface: NurbsSurface) {
    this.surface = surface;
  }

  /**
   * Walk the 3-edge ring and return the ordered corner points in this
   * triangle's CCW traversal direction. Uses this triangle's surface to
   * pick the correct per-surface endpoint view on shared edges.
   */
  corners(): [AnyTessPoint, AnyTessPoint, AnyTessPoint] {
    const edges = this.edges;
    const ep = (e: TessEdge): readonly [AnyTessPoint, AnyTessPoint] => {
      const v = e.endpoints.get(this.surface);
      if (!v) throw new Error(`TessEdge has no endpoints for triangle's surface`);
      return v;
    };
    const [e0a, e0b] = ep(edges[0]);
    const [e1a, e1b] = ep(edges[1]);
    // Corner between edges[0] and edges[1] is their shared endpoint.
    const shared = (e1a === e0a || e1a === e0b) ? e1a : e1b;
    const p0: AnyTessPoint = (e0a === shared) ? e0b : e0a;
    const p1: AnyTessPoint = shared;
    const [e2a, e2b] = ep(edges[2]);
    const p2: AnyTessPoint = (e2a === p1 || e2a === p0) ? e2b : e2a;
    return [p0, p1, p2];
  }
}
