/**
 * DefaultTool — the "idle" tool that handles surface hover, surface
 * selection (edit mode), vertex selection, and bounding-curve selection.
 *
 * This tool is always at the bottom of the editor's tool stack and is
 * never popped. Pushing a BridgeTool or FillHoleTool on top pauses it;
 * popping returns control here.
 *
 * State:
 *   hoveredSurface   — currently mouse-hovered surface (tinted)
 *   selectedSurface  — surface in edit mode (cage + CPs visible)
 *   selectedCurve    — edge on the selected surface (white highlight)
 *   selectedVertex   — CP handle with gizmo attached
 */
import {state, type StateStream} from 'lstream';
import type {Tool} from '../tool';
import type {SurfacingEditor} from '../SurfacingEditor';
import type {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from '../models/BoundingCurve/BoundingCurve.entity';
import {Vertex} from '../models/Vertex/Vertex.entity';
import {SURFACE_HOVER_COLOR, EDGE_COLORS, CP_HOVER_COLOR, SelectionGizmoOverlay} from '../three';
import {constrainEdgeToArc, removeArcConstraint} from '../ops/arc/arc.command';
import {applyG1, applyG2} from '../ops/continuity/continuity.command';
import {mirrorAcrossEdge} from '../ops/mirror/mirror.command';
import {splitIsoline} from '../ops/split/split.command';
import {pushPull} from '../ops/pushPull/pushPull.command';
import {extrude} from '../ops/extrude/extrude.command';
import {subdivide} from '../ops/subdivide/subdivide.command';

export interface DefaultToolState {
  selectedSurface: {surface: NurbsSurface} | null;
  selectedCurve: {curve: BoundingCurve, side: number, hasNeighbor: boolean} | null;
  arcDialog: {surface: NurbsSurface} | null;
}

const SURFACE_SET_HOVER_COLOR = 0xb0d4f3;
const HOVER_CURVE_COLOR = 0x111111;
const EDGE_HOVER_COLOR = 0xdd88dd;    // light magenta
const EDGE_SELECTED_COLOR = 0xcc22cc; // magenta

export class DefaultTool implements Tool {

  readonly state$: StateStream<DefaultToolState> = state<DefaultToolState>({
    selectedSurface: null,
    selectedCurve: null,
    arcDialog: null,
  });

  private editor!: SurfacingEditor;
  hoveredSurface: NurbsSurface | null = null;
  selectedSurface: NurbsSurface | null = null;
  selectedCurve: BoundingCurve | null = null;
  selectedVertex: Vertex | null = null;
  private mouseDown = false;
  private gizmo: SelectionGizmoOverlay | null = null;

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    if (!this.gizmo && editor.scene) {
      const ss = editor.sceneSetup;
      this.gizmo = new SelectionGizmoOverlay(ss, editor.scene, {
        onChange: () => editor.refreshOverlaysForDrag(),
        onDragEnd: () => {
          editor.ctx.surfacingService.scheduleSave();
          editor.ctx.surfacingService.notifyChange();
        },
      });
      ss.scene.add(this.gizmo.gizmo);
      ss.scene.add(this.gizmo.target);
    } else if (this.gizmo && editor.scene) {
      this.gizmo.setScene(editor.scene);
    }
  }

  // -------------------------------------------------------------------
  // Mouse
  // -------------------------------------------------------------------

  onMouseDown(_e: MouseEvent): void {
    this.mouseDown = true;
  }

  onMouseUp(_e: MouseEvent): void {
    this.mouseDown = false;
  }

  onClick(e: MouseEvent): void {
    this.handleClick(e);
  }

  onMouseMove(e: MouseEvent): void {
    if (this.mouseDown) return;

    if (this.selectedSurface) {
      // In edit mode: track vertex + curve hover only, no surface highlighting.
      const filter = this.cpFilter();
      const vertex = this.editor.raycast.raycastVertex(e, filter);
      this.updateVertexHover(vertex);

      const curve = this.editor.raycast.raycastCurve(e, this.selectedSurface);
      this.updateCurveHover(curve);
    } else {
      const hit = this.editor.raycast.raycastSurface(e);
      this.updateHover(hit);
    }
  }

  // -------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.selectedVertex) {
        this.deselectVertex();
      } else if (this.selectedSurface) {
        this.deselectSurface();
      }
      return;
    }

    if (!this.selectedSurface) return;
    const surface = this.selectedSurface;

    if (e.key === 'u' || e.key === 'U') {
      splitIsoline(this.editor.scene, surface, 'u', 0.5);
      this.deselectSurface();
      this.editor.rebuildAll();
    } else if (e.key === 'v' || e.key === 'V') {
      splitIsoline(this.editor.scene, surface, 'v', 0.5);
      this.deselectSurface();
      this.editor.rebuildAll();
    } else if (e.key === 'a' || e.key === 'A') {
      this.toggleArcDialog();
    }
  }

  // -------------------------------------------------------------------
  // Cleanup (called when a tool is pushed on top, or on dispose)
  // -------------------------------------------------------------------

  cleanup(): void {
    this.deselectVertex();
    this.deselectCurve();
    this.deselectSurface();
    this.clearHover();
    this.hoveredCurve = null;
    this.hoveredVertex = null;
    this.state$.next({selectedSurface: null, selectedCurve: null, arcDialog: null});
    if (this.gizmo) {
      const ss = this.editor.sceneSetup;
      ss.scene.remove(this.gizmo.gizmo);
      ss.scene.remove(this.gizmo.target);
      this.gizmo.dispose();
      this.gizmo = null;
    }
  }

  // -------------------------------------------------------------------
  // Hover
  // -------------------------------------------------------------------

  private updateHover(hit: NurbsSurface | null): void {
    if (hit === this.hoveredSurface) return;
    this.clearHover();
    this.hoveredSurface = hit;
    if (hit && !hit.editing) {
      hit.mark(SURFACE_HOVER_COLOR);
      this.markCurves(hit, HOVER_CURVE_COLOR);
      const set = hit.surfaceSet;
      if (set) {
        for (const sibling of set.surfaces) {
          if (sibling !== hit && !sibling.editing) sibling.mark(SURFACE_SET_HOVER_COLOR);
        }
      }
    }
    this.editor.requestRender();
  }

  private clearHover(): void {
    const hit = this.hoveredSurface;
    if (!hit) return;
    this.hoveredSurface = null;
    if (!hit.editing) {
      hit.unmark();
      this.unmarkCurves(hit);
      const set = hit.surfaceSet;
      if (set) {
        for (const sibling of set.surfaces) {
          if (sibling !== hit && !sibling.editing) sibling.unmark();
        }
      }
    }
  }

  private hoveredVertex: Vertex | null = null;
  private hoveredCurve: BoundingCurve | null = null;

  private updateVertexHover(vertex: Vertex | null): void {
    if (vertex === this.hoveredVertex) return;
    this.hoveredVertex?.unmark();
    this.hoveredVertex = vertex;
    if (vertex) vertex.mark(CP_HOVER_COLOR);
    this.editor.requestRender();
  }

  private updateCurveHover(curve: BoundingCurve | null): void {
    if (curve === this.hoveredCurve) return;
    // Restore the previous hovered curve to its side color (if not the selected curve)
    if (this.hoveredCurve && this.hoveredCurve !== this.selectedCurve && this.selectedSurface) {
      const side = this.selectedSurface.sideOfCurve(this.hoveredCurve);
      if (side >= 0) this.hoveredCurve.select(EDGE_COLORS[side]);
    }
    this.hoveredCurve = curve;
    // Highlight the new curve (if not already selected)
    if (curve && curve !== this.selectedCurve) {
      curve.select(EDGE_HOVER_COLOR);
    }
    this.editor.requestRender();
  }

  // -------------------------------------------------------------------
  // Click handling
  // -------------------------------------------------------------------

  private handleClick(e: MouseEvent): void {
    // 1. Vertex handle click (only when a surface is in edit mode)
    if (this.selectedSurface) {
      const filter = this.cpFilter();
      const vertex = this.editor.raycast.raycastVertex(e, filter);
      if (vertex && vertex.isSelectable()) {
        if (this.selectedVertex !== vertex) {
          this.deselectVertex();
          this.deselectCurve();
          this.selectVertex(vertex);
        }
        return;
      }
    }

    // 2. BoundingCurve click (only when a surface is in edit mode)
    if (this.selectedSurface) {
      const curve = this.editor.raycast.raycastCurve(e, this.selectedSurface);
      if (curve) {
        this.deselectVertex();
        if (this.selectedCurve !== curve) {
          this.deselectCurve();
          this.selectCurve(curve);
        }
        return;
      }
    }

    // 3. Surface click
    const hitSurface = this.editor.raycast.raycastSurface(e);

    if (hitSurface) {
      if (hitSurface === this.selectedSurface) {
        // Click on the already-selected surface: if vertex was selected,
        // just deselect vertex (stay in surface edit mode).
        if (this.selectedVertex) {
          this.deselectVertex();
          return;
        }
        // Otherwise deselect surface.
        this.deselectSurface();
        return;
      }
      // Select a new surface.
      this.deselectVertex();
      this.deselectCurve();
      this.deselectSurface();
      this.selectSurface(hitSurface);
      return;
    }

    // 4. Click on empty space
    if (this.selectedVertex) {
      this.deselectVertex();
    } else if (this.selectedSurface) {
      this.deselectSurface();
    }
  }

  // -------------------------------------------------------------------
  // Selection state transitions
  // -------------------------------------------------------------------

  selectSurface(surface: NurbsSurface): void {
    if (this.hoveredSurface === surface) {
      this.clearHover();
    }
    this.selectedSurface = surface;
    surface.enterEditMode();
    const c = surface.boundingCurves;
    c.bottom.select(EDGE_COLORS[0]);
    c.right.select(EDGE_COLORS[1]);
    c.top.select(EDGE_COLORS[2]);
    c.left.select(EDGE_COLORS[3]);
    this.syncUIState();
    this.editor.requestRender();
  }

  deselectSurface(): void {
    if (!this.selectedSurface) return;
    this.deselectVertex();
    this.deselectCurve();
    const surface = this.selectedSurface;
    this.selectedSurface = null;
    // Release curve select locks.
    const c = surface.boundingCurves;
    c.bottom.deselect();
    c.right.deselect();
    c.top.deselect();
    c.left.deselect();
    surface.exitEditMode();
    this.syncUIState();
    this.editor.requestRender();
  }

  selectCurve(curve: BoundingCurve): void {
    this.selectedCurve = curve;
    curve.select(EDGE_SELECTED_COLOR);
    this.syncUIState();
    this.editor.requestRender();
  }

  deselectCurve(): void {
    if (!this.selectedCurve) return;
    const curve = this.selectedCurve;
    this.selectedCurve = null;
    curve.deselect();
    if (this.selectedSurface) {
      const side = this.selectedSurface.sideOfCurve(curve);
      if (side >= 0) curve.select(EDGE_COLORS[side]);
    }
    this.syncUIState();
    this.editor.requestRender();
  }

  selectVertex(vertex: Vertex): void {
    this.deselectCurve();
    this.selectedVertex = vertex;
    if (this.gizmo) vertex.enterEditMode(this.gizmo);
    this.editor.requestRender();
  }

  deselectVertex(): void {
    if (!this.selectedVertex) return;
    const v = this.selectedVertex;
    this.selectedVertex = null;
    v.exitEditMode();
    this.editor.requestRender();
  }

  // -------------------------------------------------------------------
  // Curve mark/unmark helpers (tool-owned, not on entity)
  // -------------------------------------------------------------------

  private markCurves(surface: NurbsSurface, color: number): void {
    surface.boundingCurves.bottom.mark(color);
    surface.boundingCurves.right.mark(color);
    surface.boundingCurves.top.mark(color);
    surface.boundingCurves.left.mark(color);
  }

  private unmarkCurves(surface: NurbsSurface): void {
    surface.boundingCurves.bottom.unmark();
    surface.boundingCurves.right.unmark();
    surface.boundingCurves.top.unmark();
    surface.boundingCurves.left.unmark();
  }

  // -------------------------------------------------------------------
  // UI state — React components subscribe to state$ and render panels.
  // These methods just update the reactive state.
  // -------------------------------------------------------------------

  private syncUIState(): void {
    const scene = this.editor.scene;
    const surface = this.selectedSurface;
    const curve = this.selectedCurve;

    let curveInfo: DefaultToolState['selectedCurve'] = null;
    if (curve && surface && scene) {
      const side = surface.sideOfCurve(curve);
      const hasNeighbor = surface.findAdjacentSurfaces().some(a => a.side === side);
      curveInfo = {curve, side, hasNeighbor};
    }

    this.state$.next({
      selectedSurface: surface ? {surface} : null,
      selectedCurve: curveInfo,
      arcDialog: this.state$.value.arcDialog,
    });
  }

  toggleArcDialog(): void {
    if (!this.selectedSurface) return;
    const current = this.state$.value.arcDialog;
    if (current) {
      this.state$.mutate(s => { s.arcDialog = null; });
    } else {
      const surface = this.selectedSurface;
      this.state$.mutate(s => { s.arcDialog = {surface}; });
    }
  }

  closeArcDialog(): void {
    this.state$.mutate(s => { s.arcDialog = null; });
  }

  // -------------------------------------------------------------------
  // Commands called by React panel callbacks
  // -------------------------------------------------------------------

  pushPull(dist: number): void {
    const s = this.state$.value.selectedSurface;
    if (!s) return;
    pushPull(this.editor.scene, s.surface, dist);
    this.editor.rebuildAll();
  }

  extrude(dist: number): void {
    const s = this.state$.value.selectedSurface;
    if (!s) return;
    extrude(this.editor.scene, s.surface, dist);
    this.editor.rebuildAll();
  }

  subdivide(): void {
    const s = this.state$.value.selectedSurface;
    if (!s) return;
    subdivide(this.editor.scene, s.surface);
    this.deselectSurface();
    this.editor.rebuildAll();
  }

  removeSurface(): void {
    const s = this.state$.value.selectedSurface;
    if (!s) return;
    const surface = s.surface;
    if (surface.parent) surface.parent.removeChild(surface);
    surface.dispose();
    this.deselectSurface();
    this.editor.rebuildAll();
  }

  applyArc90(flip: boolean): void {
    const c = this.state$.value.selectedCurve;
    const s = this.state$.value.selectedSurface;
    if (!c || !s) return;
    const scene = this.editor.scene;
    const surface = s.surface;
    const ev = surface.getEdgeVertices(c.side);
    const {distance: vdist} = require('math/vec');
    const chord = vdist(ev[0].position, ev[3].position);
    const radius = chord / Math.SQRT2;
    let u = 0.5, v = 0.5;
    if (c.side === 0) v = 0;
    else if (c.side === 1) u = 1;
    else if (c.side === 2) v = 1;
    else if (c.side === 3) u = 0;
    let planeNormal = surface.normal(u, v);
    if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]] as any;
    scene.arcConstraints = scene.arcConstraints.filter(cc =>
      !(cc.surfaceSide.surface === surface && cc.surfaceSide.side === c.side)
    );
    constrainEdgeToArc(scene, surface, c.side, radius, 90, planeNormal, 'rational');
    this.editor.rebuildAll();
  }

  removeArc(): void {
    const c = this.state$.value.selectedCurve;
    const s = this.state$.value.selectedSurface;
    if (!c || !s) return;
    const scene = this.editor.scene;
    const surface = s.surface;
    const {lerp: vlerp} = require('math/vec');
    scene.arcConstraints = scene.arcConstraints.filter(cc => {
      if (cc.surfaceSide.surface === surface && cc.surfaceSide.side === c.side) {
        const ev = surface.getEdgeVertices(c.side);
        const lp1 = vlerp(ev[0].position, ev[3].position, 1/3);
        const lp2 = vlerp(ev[0].position, ev[3].position, 2/3);
        ev[1].set(lp1[0], lp1[1], lp1[2]);
        ev[2].set(lp2[0], lp2[1], lp2[2]);
        return false;
      }
      return true;
    });
    for (const row of surface.grid) {
      for (const cp of row) (cp as any).weight.value = 1;
    }
    this.editor.rebuildAll();
  }

  applyG1(): void {
    const c = this.state$.value.selectedCurve;
    const s = this.state$.value.selectedSurface;
    if (!c || !s) return;
    applyG1(s.surface, c.side);
    this.editor.rebuildAll();
  }

  applyG2(): void {
    const c = this.state$.value.selectedCurve;
    const s = this.state$.value.selectedSurface;
    if (!c || !s) return;
    applyG2(s.surface, c.side);
    this.editor.rebuildAll();
  }

  mirror(): void {
    const c = this.state$.value.selectedCurve;
    const s = this.state$.value.selectedSurface;
    if (!c || !s) return;
    mirrorAcrossEdge(this.editor.scene, s.surface, c.side);
    this.editor.rebuildAll();
  }

  arcRemoveConstraint(): void {
    const scene = this.editor.scene;
    if (scene.arcConstraints.length > 0) {
      removeArcConstraint(scene, scene.arcConstraints[scene.arcConstraints.length - 1]);
    }
    this.editor.rebuildAll();
    this.closeArcDialog();
  }

  /** Build the filter set of grid CPs for the selected surface. */
  private cpFilter(): Set<Vertex> {
    const allowed = new Set<Vertex>();
    if (this.selectedSurface) {
      for (const row of this.selectedSurface.grid) {
        for (const cp of row) allowed.add(cp);
      }
    }
    return allowed;
  }
}
