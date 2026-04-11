/**
 * Scene — root container for a surfacing project.
 *
 * Owns:
 *   - surfaces       — the NurbsSurface entities (shared-vertex topology)
 *   - groups         — Group entities holding direct NurbsSurface references
 *   - arc / mirror constraints  — geometric constraints
 *
 * Watertightness via shared Vertex identity. moveVertex() runs the
 * constraint enforcers; each surface invalidates itself via its
 * usedBy back-reference (no central scan, no notifySplice gymnastics).
 *
 * All ops in surfacing/ops/ operate directly on (scene, surface) — they
 * find groups via findGroupOfSurface, add/remove surfaces via Group's
 * own methods, and never need to remap indices.
 */
import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId, reserveEntityId} from '../GeometricEntity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {Group} from '../Group/Group.entity';
import {SurfaceSet} from '../../SurfaceSet';

// Re-export so other modules can import from Scene.entity directly.
export {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
export {Vertex} from '../Vertex/Vertex.entity';
export {Group} from '../Group/Group.entity';

// Lazy imports to avoid circular dependencies.
import * as _arcOps from '../../ops/arc/arc.command';
import * as _contOps from '../../ops/continuity/continuity.command';
import * as _mirrorOps from '../../ops/mirror/mirror.command';
import * as _splitOps from '../../ops/split/split.command';
import * as _fillOps from '../../ops/fillHole/fillHole.command';
import * as _pushPullOps from '../../ops/pushPull/pushPull.command';
import * as _extrudeOps from '../../ops/extrude/extrude.command';
import * as _subdivideOps from '../../ops/subdivide/subdivide.command';

// =========================================================================
// Constraint types
// =========================================================================

export type ArcMode = 'approximate' | 'rational';

export interface ArcConstraint {
  vertices: [Vertex, Vertex, Vertex, Vertex];
  radius: number;
  angle: number;
  planeNormal: Vec3;
  center: Vec3;
  mode: ArcMode;
  patchSide?: {patchIdx: number, side: number};
}

export interface MirrorConstraint {
  sourcePatchIdx: number;
  mirrorPatchIdx: number;
  planePoint: Vec3;
  planeNormal: Vec3;
  cpPairs: {source: Vertex, mirror: Vertex}[];
}

// =========================================================================
// Serialization
// =========================================================================

export interface SerializedScene {
  id?: string;
  vertices: Vec3[];
  vertexIds?: string[];
  patches: {
    id?: string;
    grid: number[][];
    weights: number[][];
    rational: boolean;
    surfaceSetId?: number;
  }[];
  arcConstraints: {
    vertexIndices: [number, number, number, number];
    radius: number;
    angle: number;
    planeNormal: Vec3;
    center: Vec3;
    mode: ArcMode;
    patchSide?: {patchIdx: number, side: number};
  }[];
  mirrorConstraints?: {
    sourcePatchIdx: number;
    mirrorPatchIdx: number;
    planePoint: Vec3;
    planeNormal: Vec3;
    cpPairs: {sourceVertexIdx: number, mirrorVertexIdx: number}[];
  }[];
  /** Each group serialized as an ordered list of surface IDs. */
  groups?: {id?: string, name: string, surfaceIds: string[]}[];
  surfaceSets?: {id: number, name: string}[];
}


// =========================================================================
// Scene
// =========================================================================

export class Scene extends GeometricEntity {

  surfaces: NurbsSurface[] = [];
  groups: Group[] = [];
  arcConstraints: ArcConstraint[] = [];
  mirrorConstraints: MirrorConstraint[] = [];
  tessResolution: number = 8;

  constructor(id?: string) {
    super(id ?? generateEntityId('SC'));
  }

  // -----------------------------------------------------------------------
  // Vertex movement → constraint cascade → per-surface invalidation
  // -----------------------------------------------------------------------

  moveVertex(v: Vertex, x: number, y: number, z: number): void {
    v.set(x, y, z);
    _arcOps.enforceArcConstraints(this, v);
    _mirrorOps.enforceMirrorConstraints(this, v);
  }

  // -----------------------------------------------------------------------
  // Groups
  // -----------------------------------------------------------------------

  createGroup(name: string, surfaces: NurbsSurface[] = []): Group {
    const g = new Group(name);
    for (const s of surfaces) g.addSurface(s);
    this.groups.push(g);
    return g;
  }

  findGroupOfSurface(surface: NurbsSurface): Group | null {
    for (const g of this.groups) if (g.hasSurface(surface)) return g;
    return null;
  }

  removeGroup(group: Group): void {
    const i = this.groups.indexOf(group);
    if (i >= 0) this.groups.splice(i, 1);
  }

  // -----------------------------------------------------------------------
  // Surface Sets — derived from each surface's .surfaceSet reference
  // -----------------------------------------------------------------------

  /** Indices of all surfaces sharing the same SurfaceSet as the given patch. */
  surfacesInSameSet(patchIdx: number): number[] {
    const surface = this.surfaces[patchIdx];
    if (!surface || !surface.surfaceSet) return [patchIdx];
    const set = surface.surfaceSet;
    const result: number[] = [];
    for (let i = 0; i < this.surfaces.length; i++) {
      if (this.surfaces[i].surfaceSet === set) result.push(i);
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Surface management
  // -----------------------------------------------------------------------

  addSurface(surface: NurbsSurface): void {
    this.surfaces.push(surface);
  }

  removeSurface(surface: NurbsSurface): void {
    const idx = this.surfaces.indexOf(surface);
    if (idx >= 0) this.surfaces.splice(idx, 1);
    // Drop from any group that holds it
    for (const g of this.groups) g.removeSurface(surface);
  }

  // -----------------------------------------------------------------------
  // Topology queries
  // -----------------------------------------------------------------------

  /** Find which surfaces share a boundary edge with a given surface. */
  findAdjacentPatches(patchIdx: number): {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] {
    const patch = this.surfaces[patchIdx];
    const result: {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] = [];
    for (let side = 0; side < 4; side++) {
      const edge = patch.getEdgeVertices(side);
      for (let oi = 0; oi < this.surfaces.length; oi++) {
        if (oi === patchIdx) continue;
        const other = this.surfaces[oi];
        for (let os = 0; os < 4; os++) {
          const otherEdge = other.getEdgeVertices(os);
          if (edge[0] === otherEdge[0] && edge[1] === otherEdge[1] &&
              edge[2] === otherEdge[2] && edge[3] === otherEdge[3]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: false});
          }
          if (edge[0] === otherEdge[3] && edge[1] === otherEdge[2] &&
              edge[2] === otherEdge[1] && edge[3] === otherEdge[0]) {
            result.push({side, otherIdx: oi, otherSide: os, reversed: true});
          }
        }
      }
    }
    return result;
  }

  /** Get the interior row/column of vertices adjacent to a side. */
  getInteriorRow(patchIdx: number, side: number, depth: number): Vertex[] {
    const g = this.surfaces[patchIdx].grid;
    switch (side) {
      case 0: return [g[depth][0], g[depth][1], g[depth][2], g[depth][3]];
      case 1: return [g[0][3 - depth], g[1][3 - depth], g[2][3 - depth], g[3][3 - depth]];
      case 2: return [g[3 - depth][0], g[3 - depth][1], g[3 - depth][2], g[3 - depth][3]];
      case 3: return [g[0][depth], g[1][depth], g[2][depth], g[3][depth]];
      default: return [];
    }
  }

  /** Find all free edges (edges with a surface on only one side). */
  findFreeEdges(): {patchIdx: number, side: number, verts: [Vertex, Vertex, Vertex, Vertex]}[] {
    const free: {patchIdx: number, side: number, verts: [Vertex, Vertex, Vertex, Vertex]}[] = [];
    for (let pi = 0; pi < this.surfaces.length; pi++) {
      const adj = this.findAdjacentPatches(pi);
      const sharedSides = new Set(adj.map(a => a.side));
      for (let side = 0; side < 4; side++) {
        if (!sharedSides.has(side)) {
          free.push({patchIdx: pi, side, verts: this.surfaces[pi].getEdgeVertices(side)});
        }
      }
    }
    return free;
  }

  // -----------------------------------------------------------------------
  // Op delegates (thin wrappers; actual logic lives in surfacing/ops/)
  // -----------------------------------------------------------------------

  constrainEdgeToArc(patchIdx: number, side: number, radius: number, angle: number, planeNormal: Vec3, mode: ArcMode = 'approximate'): ArcConstraint {
    return _arcOps.constrainEdgeToArc(this, patchIdx, side, radius, angle, planeNormal, mode);
  }
  applyArcConstraint(c: ArcConstraint): void { _arcOps.applyArcConstraint(this, c); }
  enforceArcConstraints(v: Vertex): void { _arcOps.enforceArcConstraints(this, v); }
  removeArcConstraint(constraint: ArcConstraint): void { _arcOps.removeArcConstraint(this, constraint); }
  applyG1(patchIdx: number, side: number): boolean { return _contOps.applyG1(this, patchIdx, side); }
  applyG1AllSides(patchIdx: number): void { _contOps.applyG1AllSides(this, patchIdx); }
  applyG2(patchIdx: number, side: number): boolean { return _contOps.applyG2(this, patchIdx, side); }
  mirrorAcrossEdge(patchIdx: number, side: number): number[] { return _mirrorOps.mirrorAcrossEdge(this, patchIdx, side); }
  enforceMirrorConstraints(v: Vertex): void { _mirrorOps.enforceMirrorConstraints(this, v); }
  enforceAllMirrorConstraints(): void { _mirrorOps.enforceAllMirrorConstraints(this); }
  isMirrorTarget(v: Vertex): boolean { return _mirrorOps.isMirrorTarget(this, v); }
  removeMirrorConstraint(mc: MirrorConstraint, deletePatch: boolean = true): void { _mirrorOps.removeMirrorConstraint(this, mc, deletePatch); }
  splitIsoline(patchIdx: number, direction: 'u' | 'v', t: number): void { _splitOps.splitIsoline(this, patchIdx, direction, t); }
  computeIsolinePropagation(patchIdx: number, direction: 'u' | 'v', t: number) { return _splitOps.computeIsolinePropagation(this, patchIdx, direction, t); }
  tessellateIsoline(patchIdx: number, direction: 'u' | 'v', t: number, segments: number = 24): Vec3[] { return _splitOps.tessellateIsoline(this, patchIdx, direction, t, segments); }
  traceHole(startPatchIdx: number, startSide: number) { return _fillOps.traceHole(this, startPatchIdx, startSide); }
  fillHole(loop: {patchIdx: number, side: number, verts: [Vertex, Vertex, Vertex, Vertex]}[]): boolean { return _fillOps.fillHole(this, loop); }
  pushPullPatch(patchIdx: number, distance: number): void { _pushPullOps.pushPullPatch(this, patchIdx, distance); }
  extrudePatch(patchIdx: number, distance: number): void { _extrudeOps.extrudePatch(this, patchIdx, distance); }
  subdividePatch(patchIdx: number): void { _subdivideOps.subdividePatch(this, patchIdx); }

  // -----------------------------------------------------------------------
  // Entity-graph synchronization (used by the OBJECTS explorer tree)
  // -----------------------------------------------------------------------

  syncEntityGraph(): void {
    for (const surface of this.surfaces) surface.syncEntityGraph();

    this.children = [];
    const grouped = new Set<NurbsSurface>();
    for (const g of this.groups) {
      if (g.surfaces.length === 0) continue;
      this.addChild(g);
      g.children = [];
      for (const s of g.surfaces) {
        g.addChild(s);
        grouped.add(s);
      }
    }
    for (const s of this.surfaces) {
      if (!grouped.has(s)) this.addChild(s);
    }
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): SerializedScene {
    const vertexMap = new Map<Vertex, number>();
    const vertices: Vec3[] = [];
    const vertexIds: string[] = [];
    for (const p of this.surfaces) {
      for (const row of p.grid) {
        for (const v of row) {
          if (!vertexMap.has(v)) {
            vertexMap.set(v, vertices.length);
            vertices.push([...v.position] as Vec3);
            vertexIds.push(v.id);
          }
        }
      }
    }

    const patches = this.surfaces.map(p => ({
      id: p.id,
      grid: p.grid.map(row => row.map(v => vertexMap.get(v)!)),
      weights: p.weights.map(row => [...row]),
      rational: p.rational,
      surfaceSetId: p.surfaceSet ? p.surfaceSet.id : undefined,
    }));

    const arcConstraints = this.arcConstraints.map(c => ({
      vertexIndices: c.vertices.map(v => vertexMap.get(v)!) as [number, number, number, number],
      radius: c.radius,
      angle: c.angle,
      planeNormal: [...c.planeNormal] as Vec3,
      center: [...c.center] as Vec3,
      mode: c.mode,
      patchSide: c.patchSide ? {...c.patchSide} : undefined,
    }));

    const mirrorConstraints = this.mirrorConstraints.map(mc => ({
      sourcePatchIdx: mc.sourcePatchIdx,
      mirrorPatchIdx: mc.mirrorPatchIdx,
      planePoint: [...mc.planePoint] as Vec3,
      planeNormal: [...mc.planeNormal] as Vec3,
      cpPairs: mc.cpPairs.map(pair => ({
        sourceVertexIdx: vertexMap.get(pair.source)!,
        mirrorVertexIdx: vertexMap.get(pair.mirror)!,
      })),
    }));

    const groups = this.groups.map(g => ({
      id: g.id,
      name: g.name,
      surfaceIds: g.surfaces.map(s => s.id),
    }));

    const seenSets = new Set<SurfaceSet>();
    const surfaceSets: {id: number, name: string}[] = [];
    for (const s of this.surfaces) {
      if (s.surfaceSet && !seenSets.has(s.surfaceSet)) {
        seenSets.add(s.surfaceSet);
        surfaceSets.push({id: s.surfaceSet.id, name: s.surfaceSet.name});
      }
    }

    return {id: this.id, vertices, vertexIds, patches, arcConstraints, mirrorConstraints, groups, surfaceSets};
  }

  static deserialize(data: SerializedScene): Scene {
    if (data.id) reserveEntityId(data.id);
    const scene = new Scene(data.id);

    const verts = data.vertices.map((p, i) => {
      const id = data.vertexIds && data.vertexIds[i];
      if (id) reserveEntityId(id);
      return new Vertex(p[0], p[1], p[2], id);
    });

    const setById = new Map<number, SurfaceSet>();
    if (data.surfaceSets) {
      for (const sd of data.surfaceSets) {
        setById.set(sd.id, new SurfaceSet(sd.name, sd.id));
      }
    }

    for (const pd of data.patches) {
      const grid = pd.grid.map(row => row.map(idx => verts[idx]));
      if (pd.id) reserveEntityId(pd.id);
      const surface = new NurbsSurface(grid, pd.weights.map(row => [...row]), pd.id);
      surface.rational = pd.rational;
      if (pd.surfaceSetId !== undefined) {
        const set = setById.get(pd.surfaceSetId);
        if (set) set.add(surface);
      }
      scene.surfaces.push(surface);
    }

    for (const cd of data.arcConstraints) {
      scene.arcConstraints.push({
        vertices: cd.vertexIndices.map(i => verts[i]) as [Vertex, Vertex, Vertex, Vertex],
        radius: cd.radius,
        angle: cd.angle,
        planeNormal: [...cd.planeNormal] as Vec3,
        center: [...cd.center] as Vec3,
        mode: cd.mode,
        patchSide: cd.patchSide ? {...cd.patchSide} : undefined,
      });
    }

    if (data.mirrorConstraints) {
      for (const md of data.mirrorConstraints) {
        scene.mirrorConstraints.push({
          sourcePatchIdx: md.sourcePatchIdx,
          mirrorPatchIdx: md.mirrorPatchIdx,
          planePoint: [...md.planePoint] as Vec3,
          planeNormal: [...md.planeNormal] as Vec3,
          cpPairs: md.cpPairs.map(pair => ({
            source: verts[pair.sourceVertexIdx],
            mirror: verts[pair.mirrorVertexIdx],
          })),
        });
      }
    }

    if (data.groups) {
      const surfaceById = new Map<string, NurbsSurface>();
      for (const s of scene.surfaces) surfaceById.set(s.id, s);
      for (const gd of data.groups as any[]) {
        if (gd.id) reserveEntityId(gd.id);
        const group = new Group(gd.name, gd.id);
        // Accept the new surfaceIds format and the old patchIndices format.
        if (Array.isArray(gd.surfaceIds)) {
          for (const sid of gd.surfaceIds) {
            const s = surfaceById.get(sid);
            if (s) group.addSurface(s);
          }
        } else if (Array.isArray(gd.patchIndices)) {
          for (const idx of gd.patchIndices) {
            if (idx >= 0 && idx < scene.surfaces.length) {
              group.addSurface(scene.surfaces[idx]);
            }
          }
        }
        scene.groups.push(group);
      }
    }

    return scene;
  }
}
