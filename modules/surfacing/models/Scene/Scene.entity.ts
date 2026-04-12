/**
 * Scene — root container for a surfacing project.
 *
 * The scene's `children` (inherited from GeometricEntity) IS the tree:
 * top-level entries are either Group entities or loose NurbsSurface
 * entities. There is no separate `surfaces` / `groups` storage —
 * `scene.surfaces` and `scene.groups` are getters that walk the tree.
 *
 * Mutation goes through addChild / removeChild. Direct array mutation on the
 * `surfaces` getter result has no effect (it's a fresh snapshot).
 *
 * Watertightness via shared Vertex identity. moveVertex() runs the
 * constraint enforcers; each surface invalidates itself via its
 * usedBy back-reference (no central scan, no notifySplice gymnastics).
 */
import type {Vec3} from 'math/vec';
import {GeometricEntity} from '../GeometricEntity';
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
import * as _mirrorOps from '../../ops/mirror/mirror.command';

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
  surfaceSide?: {surface: NurbsSurface, side: number};
}

export interface MirrorConstraint {
  source: NurbsSurface;
  mirror: NurbsSurface;
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
    surfaceSide?: {surfaceId: string, side: number};
  }[];
  mirrorConstraints?: {
    sourceId: string;
    mirrorId: string;
    planePoint: Vec3;
    planeNormal: Vec3;
    cpPairs: {sourceVertexIdx: number, mirrorVertexIdx: number}[];
  }[];
  /** Each group serialized as an ordered list of surface IDs. */
  groups?: {id?: string, name: string, surfaceIds: string[]}[];
  surfaceSets?: {id: number, name: string}[];
  idCounters?: Record<string, number>;
}


// =========================================================================
// Scene
// =========================================================================

export class Scene extends GeometricEntity {

  arcConstraints: ArcConstraint[] = [];
  mirrorConstraints: MirrorConstraint[] = [];

  constructor(ctx: SurfacingEditor, id?: string) {
    super(ctx, id ?? ctx.nextId('SC'));
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
      surfaceSide: c.surfaceSide ? {surfaceId: c.surfaceSide.surface.id, side: c.surfaceSide.side} : undefined,
    }));

    const mirrorConstraints = this.mirrorConstraints.map(mc => ({
      sourceId: mc.source.id,
      mirrorId: mc.mirror.id,
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

    return {id: this.id, vertices, vertexIds, patches, arcConstraints, mirrorConstraints, groups, surfaceSets, idCounters: this.ctx.getIdCounters()};
  }

  static deserialize(ctx: SurfacingEditor, data: SerializedScene): Scene {
    // Restore per-prefix ID counters before creating any entities.
    if (data.idCounters) {
      ctx.setIdCounters(data.idCounters);
    }
    const scene = new Scene(ctx, data.id);

    const verts = data.vertices.map((p, i) => {
      const id = data.vertexIds && data.vertexIds[i];
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
      const surface = new NurbsSurface(ctx, grid, curves, pd.id);
      if (pd.surfaceSetId !== undefined) {
        const set = setById.get(pd.surfaceSetId);
        if (set) set.add(surface);
      }
      scene.addChild(surface);
      orderedSurfaces.push(surface);
    }

    // Build surface ID lookup for constraint resolution.
    const surfaceById = new Map<string, NurbsSurface>();
    for (const s of orderedSurfaces) surfaceById.set(s.id, s);

    for (const cd of data.arcConstraints) {
      let surfaceSide: ArcConstraint['surfaceSide'] = undefined;
      if (cd.surfaceSide) {
        const surf = surfaceById.get(cd.surfaceSide.surfaceId);
        if (surf) surfaceSide = {surface: surf, side: cd.surfaceSide.side};
      }
      scene.arcConstraints.push({
        vertices: cd.vertexIndices.map(i => verts[i]) as unknown as [Vertex, Vertex, Vertex, Vertex],
        radius: cd.radius,
        angle: cd.angle,
        planeNormal: [...cd.planeNormal] as Vec3,
        center: [...cd.center] as Vec3,
        mode: cd.mode,
        surfaceSide,
      });
    }

    if (data.mirrorConstraints) {
      for (const md of data.mirrorConstraints) {
        const src = surfaceById.get(md.sourceId);
        const mir = surfaceById.get(md.mirrorId);
        if (!src || !mir) continue;
        const cpPairs = md.cpPairs.map(pair => ({
          source: verts[pair.sourceVertexIdx],
          mirror: verts[pair.mirrorVertexIdx],
        }));
        for (const pair of cpPairs) pair.mirror.setMirrorTarget(true);
        scene.mirrorConstraints.push({
          source: src,
          mirror: mir,
          planePoint: [...md.planePoint] as Vec3,
          planeNormal: [...md.planeNormal] as Vec3,
          cpPairs,
        });
      }
    }

    if (data.groups) {
      for (const gd of data.groups) {
        const group = new Group(ctx, gd.name, gd.id);
        scene.addChild(group);
        for (const sid of gd.surfaceIds) {
          const s = surfaceById.get(sid);
          if (s) group.addChild(s); // reparents from scene → group
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
