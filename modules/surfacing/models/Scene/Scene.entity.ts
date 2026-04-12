/**
 * Scene — root container for a surfacing project.
 *
 * The scene's `children` (inherited from GeometricEntity) IS the tree:
 * top-level entries are either Group entities or loose NurbsSurface
 * entities. There is no separate `surfaces` / `groups` storage —
 * `scene.surfaces` and `scene.groups` are getters that walk the tree.
 *
 * Mutation goes through addSurface / removeSurface / replaceSurface /
 * addGroup / removeGroup / createGroup. Direct array mutation on the
 * `surfaces` getter result has no effect (it's a fresh snapshot).
 *
 * Watertightness via shared Vertex identity. moveVertex() runs the
 * constraint enforcers; each surface invalidates itself via its
 * usedBy back-reference (no central scan, no notifySplice gymnastics).
 */
import type {Vec3} from 'math/vec';
import {GeometricEntity, generateEntityId, reserveEntityId} from '../GeometricEntity';
import {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {Vertex} from '../Vertex/Vertex.entity';
import {Group} from '../Group/Group.entity';
import {SurfaceSet} from '../../SurfaceSet';
import {BoundingCurve} from '../BoundingCurve/BoundingCurve.entity';
import {ControlPoint} from '../ControlPoint/ControlPoint.entity';
import {LocalBoundingCurveCache} from '../BoundingCurve/buildBoundingCurves';
import type {SurfacingEditor} from '../../SurfacingEditor';

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

  arcConstraints: ArcConstraint[] = [];
  mirrorConstraints: MirrorConstraint[] = [];
  tessResolution: number = 8;

  constructor(ctx: SurfacingEditor, id?: string) {
    super(ctx, id ?? generateEntityId('SC'));
  }

  /**
   * Every unique BoundingCurve currently referenced by a surface in the
   * tree. Walked once on demand — no registry state is kept anywhere.
   */
  get boundingCurves(): BoundingCurve[] {
    const seen = new Set<BoundingCurve>();
    for (const s of this.surfaces) {
      seen.add(s.boundingCurves.bottom);
      seen.add(s.boundingCurves.right);
      seen.add(s.boundingCurves.top);
      seen.add(s.boundingCurves.left);
    }
    return Array.from(seen);
  }

  // -----------------------------------------------------------------------
  // Tree-derived views
  // -----------------------------------------------------------------------

  /**
   * All NurbsSurface entities in the scene (groups walked recursively).
   * Pure tree walk — Scene caches nothing. Hot loops should capture this
   * once into a local variable instead of dereferencing in every iteration.
   */
  get surfaces(): NurbsSurface[] {
    const out: NurbsSurface[] = [];
    collectSurfaces(this, out);
    return out;
  }

  /** Top-level Group entities. */
  get groups(): Group[] {
    return this.children.filter(c => c instanceof Group) as Group[];
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
  // Surface management
  // -----------------------------------------------------------------------

  /**
   * Add a surface as a top-level child OR inside a specified group.
   * Sharing of BoundingCurves is the caller's responsibility — surfaces
   * are constructed with their `curves` already hooked up (fresh for
   * free edges, reused references for edges shared with a neighbor).
   */
  addSurface(surface: NurbsSurface, group?: Group): void {
    if (group) {
      group.addSurface(surface);
      if (group.parent !== this) this.addChild(group);
    } else {
      this.addChild(surface);
    }
  }

  /** Remove a surface from wherever it lives in the tree and dispose it. */
  removeSurface(surface: NurbsSurface): void {
    const parent = surface.parent;
    if (parent) parent.removeChild(surface);
    surface.dispose();
  }

  /**
   * Replace one surface with N new surfaces in the same parent (group
   * or scene). Used by ops like split / subdivide that produce multiple
   * outputs from one input. The old surface is disposed — its cage
   * view drops, and refcounts on shared CPs / curves decrement.
   */
  replaceSurface(oldSurface: NurbsSurface, newSurfaces: NurbsSurface[]): void {
    const parent = oldSurface.parent;
    if (!parent) return;
    const idx = parent.children.indexOf(oldSurface);
    if (idx < 0) return;
    parent.children.splice(idx, 1, ...newSurfaces);
    oldSurface.parent = null;
    for (const s of newSurfaces) {
      if (s.parent && s.parent !== parent) {
        const j = s.parent.children.indexOf(s);
        if (j >= 0) s.parent.children.splice(j, 1);
      }
      s.parent = parent;
    }
    oldSurface.dispose();
  }

  // -----------------------------------------------------------------------
  // Groups
  // -----------------------------------------------------------------------

  /** Create a group, populate it with surfaces, and add it to the scene. */
  createGroup(name: string, surfaces: NurbsSurface[] = []): Group {
    const g = new Group(this.ctx, name);
    for (const s of surfaces) g.addSurface(s);
    this.addChild(g);
    return g;
  }

  /** Find the group that contains a given surface, or null. */
  findGroupOfSurface(surface: NurbsSurface): Group | null {
    let cur = surface.parent;
    while (cur && cur !== this) {
      if (cur instanceof Group) return cur;
      cur = cur.parent;
    }
    return null;
  }

  /** Remove a group (and everything inside it). */
  removeGroup(group: Group): void {
    if (group.parent === this) this.removeChild(group);
  }

  // -----------------------------------------------------------------------
  // Surface Sets — derived from each surface's .surfaceSet reference
  // -----------------------------------------------------------------------

  /** Indices of all surfaces sharing the same SurfaceSet as the given patch. */
  surfacesInSameSet(patchIdx: number): number[] {
    const all = this.surfaces;
    const surface = all[patchIdx];
    if (!surface || !surface.surfaceSet) return [patchIdx];
    const set = surface.surfaceSet;
    const result: number[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].surfaceSet === set) result.push(i);
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Topology queries
  // -----------------------------------------------------------------------

  /** Find which surfaces share a boundary edge with a given surface. */
  findAdjacentPatches(patchIdx: number): {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] {
    // Capture once — `surfaces` is a tree-walking getter.
    const all = this.surfaces;
    const patch = all[patchIdx];
    const result: {side: number, otherIdx: number, otherSide: number, reversed: boolean}[] = [];
    for (let side = 0; side < 4; side++) {
      const edge = patch.getEdgeVertices(side);
      for (let oi = 0; oi < all.length; oi++) {
        if (oi === patchIdx) continue;
        const other = all[oi];
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
  findFreeEdges(): {patchIdx: number, side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] {
    const all = this.surfaces;
    const free: {patchIdx: number, side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[] = [];
    for (let pi = 0; pi < all.length; pi++) {
      const adj = this.findAdjacentPatches(pi);
      const sharedSides = new Set(adj.map(a => a.side));
      for (let side = 0; side < 4; side++) {
        if (!sharedSides.has(side)) {
          free.push({patchIdx: pi, side, verts: all[pi].getEdgeVertices(side)});
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
  fillHole(loop: {patchIdx: number, side: number, verts: [ControlPoint, ControlPoint, ControlPoint, ControlPoint]}[]): boolean { return _fillOps.fillHole(this, loop); }
  pushPullPatch(patchIdx: number, distance: number): void { _pushPullOps.pushPullPatch(this, patchIdx, distance); }
  extrudePatch(patchIdx: number, distance: number): void { _extrudeOps.extrudePatch(this, patchIdx, distance); }
  subdividePatch(patchIdx: number): void { _subdivideOps.subdividePatch(this, patchIdx); }

  // -----------------------------------------------------------------------
  // Entity-graph synchronization (used by the OBJECTS explorer tree)
  // -----------------------------------------------------------------------

  /**
   * Refresh derived per-surface state (control points, bounding curves,
   * cage). The scene's `children` is already the live tree — there is
   * nothing else to rebuild here.
   */
  syncEntityGraph(): void {
    for (const surface of this.surfaces) surface.syncEntityGraph();
    // Drop empty groups so the explorer doesn't show them.
    for (const g of [...this.groups]) {
      if (g.surfaces.length === 0) this.removeChild(g);
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
      weights: p.getWeightsMatrix(),
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

  static deserialize(ctx: SurfacingEditor, data: SerializedScene): Scene {
    if (data.id) reserveEntityId(data.id);
    const scene = new Scene(ctx, data.id);

    // Every serialized vertex is a NURBS control point — weights come
    // from `patch.weights` and are applied by NurbsSurface's constructor
    // after the CP instances are created.
    const verts = data.vertices.map((p, i) => {
      const id = data.vertexIds && data.vertexIds[i];
      if (id) reserveEntityId(id);
      return new ControlPoint(ctx, p[0], p[1], p[2], 1, id);
    });

    const setById = new Map<number, SurfaceSet>();
    if (data.surfaceSets) {
      for (const sd of data.surfaceSets) {
        setById.set(sd.id, new SurfaceSet(sd.name, sd.id));
      }
    }

    // Local BoundingCurve cache — shared edges between patches get the
    // same BoundingCurve instance during this one load pass. After the
    // scene is built, sharing lives in the entity graph itself.
    const curveCache = new LocalBoundingCurveCache();

    // Build surfaces and put them as direct scene children for now —
    // groups (processed below) will reparent the ones they own.
    const orderedSurfaces: NurbsSurface[] = [];
    for (const pd of data.patches) {
      const grid = pd.grid.map(row => row.map(idx => verts[idx]));
      // Apply serialized weights to the (possibly shared) grid CPs.
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          grid[r][c].weight.value = pd.weights[r][c];
        }
      }
      const curves = curveCache.curvesFor(ctx, grid);
      if (pd.id) reserveEntityId(pd.id);
      const surface = new NurbsSurface(ctx, grid, curves, pd.id);
      if (pd.surfaceSetId !== undefined) {
        const set = setById.get(pd.surfaceSetId);
        if (set) set.add(surface);
      }
      scene.addChild(surface);
      orderedSurfaces.push(surface);
    }

    for (const cd of data.arcConstraints) {
      scene.arcConstraints.push({
        vertices: cd.vertexIndices.map(i => verts[i]) as unknown as [Vertex, Vertex, Vertex, Vertex],
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
      for (const s of orderedSurfaces) surfaceById.set(s.id, s);
      for (const gd of data.groups as any[]) {
        if (gd.id) reserveEntityId(gd.id);
        const group = new Group(ctx, gd.name, gd.id);
        scene.addChild(group);
        // Accept the new surfaceIds format and the old patchIndices format.
        if (Array.isArray(gd.surfaceIds)) {
          for (const sid of gd.surfaceIds) {
            const s = surfaceById.get(sid);
            if (s) group.addSurface(s); // reparents from scene → group
          }
        } else if (Array.isArray(gd.patchIndices)) {
          for (const idx of gd.patchIndices) {
            if (idx >= 0 && idx < orderedSurfaces.length) {
              group.addSurface(orderedSurfaces[idx]);
            }
          }
        }
      }
    }

    return scene;
  }
}

// =========================================================================
// Helpers
// =========================================================================

function collectSurfaces(node: GeometricEntity, out: NurbsSurface[]): void {
  for (const child of node.children) {
    if (child instanceof NurbsSurface) {
      out.push(child);
    } else if (child instanceof Group) {
      collectSurfaces(child, out);
    }
  }
}
