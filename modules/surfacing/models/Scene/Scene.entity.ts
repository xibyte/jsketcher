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
 * Constraints are event-driven: a `ControlPoint.set(...)` call fires
 * `scene.notifyControlPointLocationChange(cp)`, and each constraint
 * (arc lives on its BoundingCurve, mirror lives in
 * `globalConstraints.mirror`) has its own subscription that re-applies
 * itself when a CP it cares about moves. No central enforcer.
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

import {sub as vsub, dot as vdot} from 'math/vec';

import type {ArcMode} from '../../ops/arc/arc.types';
import type {MirrorConstraint} from '../../ops/mirror/mirror.types';
import * as _arcOps from '../../ops/arc/arc.command';

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
    /**
     * Arc constraints attached to this surface's edges, keyed by side
     * (0=bottom, 1=right, 2=top, 3=left). Stored with the patch rather
     * than the curve because the same BoundingCurve may be shared by
     * multiple surfaces but the constraint was authored against one
     * specific side of one specific surface.
     */
    arcConstraints?: {
      side: number;
      radius: number;
      angle: number;
      planeNormal: Vec3;
      center: Vec3;
      mode: ArcMode;
    }[];
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

  /**
   * Global, non-curve-local constraints. Arc constraints live directly
   * on their `BoundingCurve` (via `curve.constraints.arc`) — only
   * constraints that cross more than one surface belong here.
   */
  readonly globalConstraints: {mirror: MirrorConstraint[]} = {mirror: []};

  /** Listeners invoked on every ControlPoint.set(). */
  private cpLocationListeners: Set<(cp: ControlPoint) => void> = new Set();

  constructor(ctx: SurfacingEditor, id?: string) {
    super(ctx, id ?? ctx.nextId('SC'));
  }

  // -----------------------------------------------------------------------
  // Control-point location events — emitted by ControlPoint.set(),
  // consumed by constraint subscribers (arc, mirror, and any future ones).
  // -----------------------------------------------------------------------

  /**
   * Register a listener that fires whenever any ControlPoint in this
   * scene moves. Returns an unsubscribe function (O(1) via Set.delete).
   */
  onControlPointLocationChange(listener: (cp: ControlPoint) => void): () => void {
    this.cpLocationListeners.add(listener);
    return () => { this.cpLocationListeners.delete(listener); };
  }

  /**
   * Called by `ControlPoint.set()` after the position write. Walks a
   * snapshot of the listener set so listeners mutating the set during
   * dispatch (e.g. by adding another constraint mid-cascade) don't
   * corrupt iteration.
   */
  notifyControlPointLocationChange(cp: ControlPoint): void {
    const snapshot = Array.from(this.cpLocationListeners);
    for (const listener of snapshot) {
      try { listener(cp); } catch (e) { console.error(e); }
    }
  }

  // -----------------------------------------------------------------------
  // Mirror constraints — global, scene-level
  // -----------------------------------------------------------------------

  /**
   * Add a mirror constraint and wire its reactive enforcement. The
   * constraint is pushed into `globalConstraints.mirror` and a
   * cp-change listener is attached that reflects any moved source CP
   * to its mirror partner. The attached unsubscribe is stored on the
   * constraint so `removeMirrorConstraint` can tear it down.
   */
  addMirrorConstraint(mc: MirrorConstraint): void {
    const sourceToMirror = new Map<Vertex, Vertex>();
    for (const pair of mc.cpPairs) sourceToMirror.set(pair.source, pair.mirror);
    mc.unsubscribe = this.onControlPointLocationChange(cp => {
      const mirrorCp = sourceToMirror.get(cp);
      if (!mirrorCp) return;
      const p = cp.position;
      const d = vdot(vsub(p, mc.planePoint), mc.planeNormal);
      mirrorCp.set(
        p[0] - 2 * d * mc.planeNormal[0],
        p[1] - 2 * d * mc.planeNormal[1],
        p[2] - 2 * d * mc.planeNormal[2],
      );
    });
    this.globalConstraints.mirror.push(mc);
  }

  /**
   * Remove a mirror constraint: splice it out of `globalConstraints.mirror`,
   * detach its cp-change listener, and clear the mirror-target flag on
   * every vertex it owned exclusively (some mirror targets can belong
   * to more than one constraint in a chained mirror).
   */
  removeMirrorConstraint(mc: MirrorConstraint): void {
    const idx = this.globalConstraints.mirror.indexOf(mc);
    if (idx < 0) return;
    this.globalConstraints.mirror.splice(idx, 1);
    mc.unsubscribe?.();
    mc.unsubscribe = undefined;
    const stillTarget = new Set<Vertex>();
    for (const other of this.globalConstraints.mirror) {
      for (const pair of other.cpPairs) stillTarget.add(pair.mirror);
    }
    for (const pair of mc.cpPairs) {
      if (!stillTarget.has(pair.mirror)) pair.mirror.setMirrorTarget(false);
    }
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

    const patches = this.surfaces.map(p => {
      const arcConstraints: SerializedScene['patches'][number]['arcConstraints'] = [];
      const sides = [p.boundingCurves.bottom, p.boundingCurves.right,
                     p.boundingCurves.top, p.boundingCurves.left];
      for (let side = 0; side < 4; side++) {
        const arc = sides[side].constraints.arc;
        if (!arc) continue;
        arcConstraints.push({
          side,
          radius: arc.radius,
          angle: arc.angle,
          planeNormal: [...arc.planeNormal] as Vec3,
          center: [...arc.center] as Vec3,
          mode: arc.mode,
        });
      }
      return {
        id: p.id,
        grid: p.grid.map(row => row.map(v => vertexMap.get(v)!)),
        weights: p.getWeightsMatrix(),
        rational: p.rational,
        surfaceSetId: p.surfaceSet ? p.surfaceSet.id : undefined,
        arcConstraints: arcConstraints.length > 0 ? arcConstraints : undefined,
      };
    });

    const mirrorConstraints = this.globalConstraints.mirror.map(mc => ({
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

    return {id: this.id, vertices, vertexIds, patches, mirrorConstraints, groups, surfaceSets, idCounters: this.ctx.getIdCounters()};
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

    // Restore arc constraints — each patch owns its own list of
    // per-side arcs. We rebuild them by calling the op, which re-runs
    // applyArcConstraint and hooks up the reactive subscription.
    for (let pi = 0; pi < data.patches.length; pi++) {
      const pd = data.patches[pi];
      if (!pd.arcConstraints) continue;
      const surface = orderedSurfaces[pi];
      for (const ac of pd.arcConstraints) {
        _arcOps.constrainEdgeToArc(
          surface, ac.side, ac.radius, ac.angle,
          [...ac.planeNormal] as Vec3, ac.mode,
        );
      }
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
        scene.addMirrorConstraint({
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
