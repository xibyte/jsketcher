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
import type {Tool} from '../tool';
import type {SurfacingEditor} from '../SurfacingEditor';
import type {NurbsSurface} from '../models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from '../models/BoundingCurve/BoundingCurve.entity';
import {Vertex} from '../models/Vertex/Vertex.entity';
import {SURFACE_HOVER_COLOR, EDGE_COLORS, CP_HOVER_COLOR, SelectionGizmoOverlay} from '../three';
import {showNurbsSurfaceDialog, closeNurbsSurfaceDialog} from '../models/NurbsSurface/NurbsSurface.dialog';
import {showArcDialog, closeArcDialog} from '../ops/arc/arc.dialog';
import {showEdgeDialog, closeBoundingCurveDialog} from '../models/BoundingCurve/BoundingCurve.dialog';

const SURFACE_SET_HOVER_COLOR = 0xb0d4f3;
const HOVER_CURVE_COLOR = 0x111111;
const EDGE_SELECTED_COLOR = 0xffffff;

export class DefaultTool implements Tool {

  private editor!: SurfacingEditor;
  hoveredSurface: NurbsSurface | null = null;
  selectedSurface: NurbsSurface | null = null;
  selectedCurve: BoundingCurve | null = null;
  selectedVertex: Vertex | null = null;
  private mouseDown = false;
  private gizmo: SelectionGizmoOverlay | null = null;
  private propsPanel: HTMLDivElement | null = null;
  private edgePanel: HTMLDivElement | null = null;
  private arcState: {panel: HTMLDivElement | null} = {panel: null};

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    if (!this.gizmo && editor.scene) {
      const ss = editor.sceneSetup;
      this.gizmo = new SelectionGizmoOverlay(ss, editor.scene, {
        onChange: () => editor.refreshOverlaysForDrag(),
        onDragEnd: () => {
          editor.scene.syncEntityGraph();
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
    const hit = this.editor.raycast.raycastSurface(e);
    this.updateHover(hit);

    if (this.selectedSurface) {
      const filter = this.cpFilter();
      const vertex = this.editor.raycast.raycastVertex(e, filter);
      this.updateVertexHover(vertex);
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
    const patchIdx = this.editor.scene!.surfaces.indexOf(this.selectedSurface);

    if (e.key === 'u' || e.key === 'U') {
      this.editor.scene!.splitIsoline(patchIdx, 'u', 0.5);
      this.deselectSurface();
      this.editor.rebuildAll();
    } else if (e.key === 'v' || e.key === 'V') {
      this.editor.scene!.splitIsoline(patchIdx, 'v', 0.5);
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
    this.closePropsDialog();
    this.closeEdgeDialog();
    closeArcDialog(this.arcState);
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

  private updateVertexHover(vertex: Vertex | null): void {
    if (vertex === this.hoveredVertex) return;
    this.hoveredVertex?.unmark();
    this.hoveredVertex = vertex;
    if (vertex) vertex.mark(CP_HOVER_COLOR);
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

  private selectSurface(surface: NurbsSurface): void {
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
    this.showPropsDialog(surface);
    this.editor.requestRender();
  }

  private deselectSurface(): void {
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
    this.closePropsDialog();
    this.editor.requestRender();
  }

  private selectCurve(curve: BoundingCurve): void {
    this.selectedCurve = curve;
    curve.select(EDGE_SELECTED_COLOR);
    this.showEdgeDialog(curve);
    this.editor.requestRender();
  }

  private deselectCurve(): void {
    if (!this.selectedCurve) return;
    const curve = this.selectedCurve;
    this.selectedCurve = null;
    curve.deselect();
    if (this.selectedSurface) {
      const side = this.selectedSurface.sideOfCurve(curve);
      if (side >= 0) curve.select(EDGE_COLORS[side]);
    }
    this.closeEdgeDialog();
    this.editor.requestRender();
  }

  private selectVertex(vertex: Vertex): void {
    this.deselectCurve();
    this.selectedVertex = vertex;
    if (this.gizmo) vertex.enterEditMode(this.gizmo);
    this.editor.requestRender();
  }

  private deselectVertex(): void {
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
  // Props dialog
  // -------------------------------------------------------------------

  private showPropsDialog(surface: NurbsSurface): void {
    this.closePropsDialog();
    const scene = this.editor.scene!;
    const patchIdx = scene.surfaces.indexOf(surface);
    this.propsPanel = showNurbsSurfaceDialog(surface, patchIdx, {
      onClose: () => this.deselectSurface(),
      onPushPull: (dist) => {
        scene.pushPullPatch(patchIdx, dist);
        this.editor.rebuildAll();
      },
      onExtrude: (dist) => {
        scene.extrudePatch(patchIdx, dist);
        this.editor.rebuildAll();
      },
      onSubdivide: () => {
        scene.subdividePatch(patchIdx);
        this.deselectSurface();
        this.editor.rebuildAll();
      },
      onRemove: () => {
        scene.removeSurface(surface);
        this.deselectSurface();
        this.editor.rebuildAll();
      },
    });
  }

  private closePropsDialog(): void {
    closeNurbsSurfaceDialog(this.propsPanel);
    this.propsPanel = null;
  }

  // -------------------------------------------------------------------
  // Edge dialog
  // -------------------------------------------------------------------

  private showEdgeDialog(curve: BoundingCurve): void {
    this.closeEdgeDialog();
    const surface = this.selectedSurface!;
    const scene = this.editor.scene!;
    const patchIdx = scene.surfaces.indexOf(surface);
    const edgeIdx = surface.sideOfCurve(curve);
    const adj = scene.findAdjacentPatches(patchIdx);
    const hasNeighbor = adj.some((a: any) => a.side === edgeIdx);

    const rebuildAndReopen = () => {
      this.editor.rebuildAll();
      this.showEdgeDialog(curve);
    };

    this.edgePanel = showEdgeDialog(curve, hasNeighbor, {
      onClose: () => this.deselectCurve(),
      onArc90Out: () => {
        this.applyArc90(patchIdx, edgeIdx, false);
        rebuildAndReopen();
      },
      onArc90In: () => {
        this.applyArc90(patchIdx, edgeIdx, true);
        rebuildAndReopen();
      },
      onRemoveArc: () => {
        this.removeArc(patchIdx, edgeIdx);
        rebuildAndReopen();
      },
      onG1: () => {
        scene.applyG1(patchIdx, edgeIdx);
        rebuildAndReopen();
      },
      onG2: () => {
        scene.applyG2(patchIdx, edgeIdx);
        rebuildAndReopen();
      },
      onMirror: () => {
        scene.mirrorAcrossEdge(patchIdx, edgeIdx);
        rebuildAndReopen();
      },
    });
  }

  private closeEdgeDialog(): void {
    closeBoundingCurveDialog(this.edgePanel);
    this.edgePanel = null;
  }

  private applyArc90(patchIdx: number, side: number, flip: boolean): void {
    const scene = this.editor.scene!;
    const patch = scene.surfaces[patchIdx];
    const ev = patch.getEdgeVertices(side);
    const {distance: vdist} = require('math/vec');
    const chord = vdist(ev[0].position, ev[3].position);
    const radius = chord / Math.SQRT2;
    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    let planeNormal = patch.normal(u, v);
    if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]] as any;
    scene.arcConstraints = scene.arcConstraints.filter((c: any) =>
      !(c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side)
    );
    scene.constrainEdgeToArc(patchIdx, side, radius, 90, planeNormal, 'rational');
  }

  private removeArc(patchIdx: number, edgeIdx: number): void {
    const scene = this.editor.scene!;
    const {lerp: vlerp} = require('math/vec');
    scene.arcConstraints = scene.arcConstraints.filter((c: any) => {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === edgeIdx) {
        const ev = scene.surfaces[patchIdx].getEdgeVertices(edgeIdx);
        const lp1 = vlerp(ev[0].position, ev[3].position, 1/3);
        const lp2 = vlerp(ev[0].position, ev[3].position, 2/3);
        ev[1].set(lp1[0], lp1[1], lp1[2]);
        ev[2].set(lp2[0], lp2[1], lp2[2]);
        return false;
      }
      return true;
    });
    const selPatch = scene.surfaces[patchIdx];
    for (const row of selPatch.grid) {
      for (const cp of row) (cp as any).weight.value = 1;
    }
  }

  // -------------------------------------------------------------------
  // Arc dialog
  // -------------------------------------------------------------------

  private toggleArcDialog(): void {
    if (!this.selectedSurface) return;
    if (this.arcState.panel) {
      closeArcDialog(this.arcState);
      return;
    }
    const scene = this.editor.scene!;
    const patchIdx = scene.surfaces.indexOf(this.selectedSurface);
    const result = showArcDialog(scene, patchIdx, {
      onClose: () => closeArcDialog(this.arcState),
      onRemove: () => {
        if (scene.arcConstraints.length > 0) {
          scene.removeArcConstraint(scene.arcConstraints[scene.arcConstraints.length - 1]);
        }
        this.editor.rebuildAll();
        closeArcDialog(this.arcState);
      },
      onApply: () => {
        this.editor.rebuildAll();
      },
    });
    this.arcState.panel = result.panel;
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
