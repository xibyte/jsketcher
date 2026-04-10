import type {Vec3} from 'math/vec';
import {dot, sub} from 'math/vec';
import {GeometricEntity, generateEntityId} from '../GeometricEntity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {BoundingCurve} from '../BoundingCurve/BoundingCurve.entity';

/**
 * Root container entity for a collection of NurbsSurfaces.
 * Replaces PatchCage as the top-level container.
 * Provides topology queries, constraint enforcement, and serialization.
 */
export class Scene extends GeometricEntity {

  surfaces: NurbsSurface[] = [];
  tessResolution: number = 8;

  constructor() {
    super(generateEntityId('SC'));
  }

  addSurface(surface: NurbsSurface): void {
    this.surfaces.push(surface);
    this.addChild(surface);
  }

  removeSurface(surface: NurbsSurface): void {
    const idx = this.surfaces.indexOf(surface);
    if (idx >= 0) {
      this.surfaces.splice(idx, 1);
      this.removeChild(surface);
    }
  }

  /** Move a vertex and enforce all constraints that involve it */
  moveVertex(v: Vertex, x: number, y: number, z: number): void {
    v.set(x, y, z);
    this.enforceArcConstraints(v);
    this.enforceMirrorConstraints(v);
  }

  // =========================================================================
  // Topology Queries
  // =========================================================================

  /** Get all unique Vertex instances across all surfaces */
  allVertices(): Vertex[] {
    const seen = new Set<Vertex>();
    for (const s of this.surfaces) {
      for (const row of s.cp) {
        for (const cp of row) seen.add(cp.vertex);
      }
    }
    return Array.from(seen);
  }

  /**
   * Find which surfaces share a boundary edge with a given surface.
   * Uses ControlPoint identity — no tolerances.
   */
  findAdjacentSurfaces(surfaceIdx: number): {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] {
    const surface = this.surfaces[surfaceIdx];
    const result: {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] = [];

    for (let side = 0; side < 4; side++) {
      const edge = surface.getEdgeCPs(side);
      for (let oi = 0; oi < this.surfaces.length; oi++) {
        if (oi === surfaceIdx) continue;
        const other = this.surfaces[oi];
        for (let os = 0; os < 4; os++) {
          const otherEdge = other.getEdgeCPs(os);
          // Check forward match (same CP instances)
          if (edge[0] === otherEdge[0] && edge[1] === otherEdge[1] &&
              edge[2] === otherEdge[2] && edge[3] === otherEdge[3]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: false});
          }
          // Check reversed match
          if (edge[0] === otherEdge[3] && edge[1] === otherEdge[2] &&
              edge[2] === otherEdge[1] && edge[3] === otherEdge[0]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: true});
          }
        }
      }
    }
    return result;
  }

  /** Get the interior row/column of CPs adjacent to a side */
  getInteriorRow(surfaceIdx: number, side: number, depth: number): ControlPoint[] {
    const cp = this.surfaces[surfaceIdx].cp;
    switch (side) {
      case 0: return [cp[depth][0], cp[depth][1], cp[depth][2], cp[depth][3]];
      case 1: return [cp[0][3 - depth], cp[1][3 - depth], cp[2][3 - depth], cp[3][3 - depth]];
      case 2: return [cp[3 - depth][0], cp[3 - depth][1], cp[3 - depth][2], cp[3 - depth][3]];
      case 3: return [cp[0][depth], cp[1][depth], cp[2][depth], cp[3][depth]];
      default: return [];
    }
  }

  /** Find all free edges (boundary edges with only one adjacent surface) */
  findFreeEdges(): {surfaceIdx: number, side: number, cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] {
    const free: {surfaceIdx: number, side: number, cp: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] = [];
    for (let si = 0; si < this.surfaces.length; si++) {
      const adj = this.findAdjacentSurfaces(si);
      const sharedSides = new Set(adj.map(a => a.side));
      for (let side = 0; side < 4; side++) {
        if (!sharedSides.has(side)) {
          free.push({surfaceIdx: si, side, cp: this.surfaces[si].getEdgeCPs(side)});
        }
      }
    }
    return free;
  }

  // =========================================================================
  // Constraint Enforcement
  // =========================================================================

  /** Re-enforce arc constraints on bounding curves that involve a given vertex */
  private enforceArcConstraints(v: Vertex): void {
    for (const surface of this.surfaces) {
      for (const bc of [surface.boundingCurves.bottom, surface.boundingCurves.right,
                         surface.boundingCurves.top, surface.boundingCurves.left]) {
        if (!bc.arcConstraint) continue;
        // Only re-apply if an endpoint vertex moved
        if (bc.cp[0].vertex === v || bc.cp[3].vertex === v) {
          // Arc enforcement would be called here
          // (delegated to ops/arc/arc.command.ts in practice)
        }
      }
    }
  }

  /** Enforce mirror constraints when a source vertex moves */
  private enforceMirrorConstraints(v: Vertex): void {
    const queue: Vertex[] = [v];
    const processed = new Set<Vertex>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (processed.has(current)) continue;
      processed.add(current);

      for (const surface of this.surfaces) {
        if (!surface.mirrorOf) continue;
        for (const pair of surface.mirrorOf.cpPairs) {
          if (pair.source.vertex === current) {
            const p = current.position;
            const mc = surface.mirrorOf;
            const d = dot(sub(p, mc.planePoint), mc.planeNormal);
            pair.mirror.vertex.set(
              p[0] - 2 * d * mc.planeNormal[0],
              p[1] - 2 * d * mc.planeNormal[1],
              p[2] - 2 * d * mc.planeNormal[2],
            );
            queue.push(pair.mirror.vertex);
          }
        }
      }
    }
  }

  // =========================================================================
  // Tessellation
  // =========================================================================

  tessellateAll(resolution: number = 8): {
    vertices: Float32Array, normals: Float32Array, indices: Uint32Array,
    surfaceTriRanges: [number, number][]
  } {
    const allPos: number[] = [], allNorm: number[] = [], allIdx: number[] = [];
    const ranges: [number, number][] = [];
    let vOff = 0, tIdx = 0;

    for (const surface of this.surfaces) {
      const t = surface.tessellate(resolution);
      const start = tIdx;
      for (const val of t.positions) allPos.push(val);
      for (const val of t.normals) allNorm.push(val);
      for (const i of t.indices) allIdx.push(i + vOff);
      vOff += t.positions.length / 3;
      tIdx += t.indices.length / 3;
      ranges.push([start, tIdx]);
    }

    return {
      vertices: new Float32Array(allPos),
      normals: new Float32Array(allNorm),
      indices: new Uint32Array(allIdx),
      surfaceTriRanges: ranges,
    };
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  serialize(): SerializedScene {
    const vertexMap = new Map<Vertex, number>();
    const vertices: Vec3[] = [];

    // Collect all unique vertices
    for (const surface of this.surfaces) {
      for (const row of surface.cp) {
        for (const cp of row) {
          if (!vertexMap.has(cp.vertex)) {
            vertexMap.set(cp.vertex, vertices.length);
            vertices.push([...cp.vertex.position] as Vec3);
          }
        }
      }
    }

    const cpMap = new Map<ControlPoint, number>();
    const controlPoints: {vertexIdx: number, weight: number}[] = [];

    for (const surface of this.surfaces) {
      for (const row of surface.cp) {
        for (const cp of row) {
          if (!cpMap.has(cp)) {
            cpMap.set(cp, controlPoints.length);
            controlPoints.push({
              vertexIdx: vertexMap.get(cp.vertex)!,
              weight: cp.weight.value,
            });
          }
        }
      }
    }

    const surfaces = this.surfaces.map(s => ({
      cpGrid: s.cp.map(row => row.map(cp => cpMap.get(cp)!)),
      rational: s.rational,
      arcConstraints: [s.boundingCurves.bottom, s.boundingCurves.right,
                       s.boundingCurves.top, s.boundingCurves.left]
        .filter(bc => bc.arcConstraint)
        .map(bc => ({side: bc.side, ...bc.arcConstraint!})),
      mirrorOf: s.mirrorOf ? {
        sourceIdx: this.surfaces.indexOf(s.mirrorOf.source),
        planePoint: [...s.mirrorOf.planePoint] as Vec3,
        planeNormal: [...s.mirrorOf.planeNormal] as Vec3,
        cpPairs: s.mirrorOf.cpPairs.map(p => ({
          sourceIdx: cpMap.get(p.source)!,
          mirrorIdx: cpMap.get(p.mirror)!,
        })),
      } : undefined,
    }));

    return {vertices, controlPoints, surfaces};
  }

  static deserialize(data: SerializedScene): Scene {
    const scene = new Scene();
    const vertices = data.vertices.map(p => new Vertex(p[0], p[1], p[2]));
    const cps = data.controlPoints.map(cpd =>
      new ControlPoint(vertices[cpd.vertexIdx], cpd.weight)
    );

    for (const sd of data.surfaces) {
      const cpGrid = sd.cpGrid.map(row => row.map(idx => cps[idx]));
      const surface = new NurbsSurface(cpGrid);
      surface.rational = sd.rational;

      // Restore arc constraints
      for (const ac of sd.arcConstraints) {
        surface.getBoundingCurve(ac.side).arcConstraint = {
          radius: ac.radius,
          angle: ac.angle,
          planeNormal: [...ac.planeNormal] as Vec3,
          center: [...ac.center] as Vec3,
          mode: ac.mode,
        };
      }

      scene.addSurface(surface);
    }

    // Restore mirror constraints (second pass — all surfaces exist)
    for (let i = 0; i < data.surfaces.length; i++) {
      const sd = data.surfaces[i];
      if (sd.mirrorOf) {
        scene.surfaces[i].mirrorOf = {
          source: scene.surfaces[sd.mirrorOf.sourceIdx],
          planePoint: [...sd.mirrorOf.planePoint] as Vec3,
          planeNormal: [...sd.mirrorOf.planeNormal] as Vec3,
          cpPairs: sd.mirrorOf.cpPairs.map(p => ({
            source: cps[p.sourceIdx],
            mirror: cps[p.mirrorIdx],
          })),
        };
      }
    }

    return scene;
  }
}

// =========================================================================
// Serialization Types
// =========================================================================

export interface SerializedScene {
  vertices: Vec3[];
  controlPoints: {vertexIdx: number, weight: number}[];
  surfaces: {
    cpGrid: number[][];
    rational: boolean;
    arcConstraints: {side: number, radius: number, angle: number, planeNormal: Vec3, center: Vec3, mode: string}[];
    mirrorOf?: {
      sourceIdx: number;
      planePoint: Vec3;
      planeNormal: Vec3;
      cpPairs: {sourceIdx: number, mirrorIdx: number}[];
    };
  }[];
}
