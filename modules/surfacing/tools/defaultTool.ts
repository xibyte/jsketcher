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
import {SURFACE_HOVER_COLOR, EDGE_COLORS, SelectionGizmoOverlay} from '../three';
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
  private _mouseDown = false;
  private _gizmo: SelectionGizmoOverlay | null = null;
  private _propsPanel: HTMLDivElement | null = null;
  private _edgePanel: HTMLDivElement | null = null;
  private _arcState: {panel: HTMLDivElement | null} = {panel: null};

  init(editor: SurfacingEditor): void {
    this.editor = editor;
    if (!this._gizmo && editor.scene) {
      const ss = editor.sceneSetup;
      this._gizmo = new SelectionGizmoOverlay(ss, editor.scene, {
        onChange: () => {
          editor.refreshOverlaysForDrag();
        },
        onDragEnd: () => {
          editor.rebuildAll();
        },
      });
      ss.scene.add(this._gizmo.gizmo);
      ss.scene.add(this._gizmo.target);
    } else if (this._gizmo && editor.scene) {
      this._gizmo.setScene(editor.scene);
    }
  }

  // -------------------------------------------------------------------
  // Mouse
  // -------------------------------------------------------------------

  onMouseDown(_e: MouseEvent): void {
    this._mouseDown = true;
  }

  onMouseUp(e: MouseEvent): void {
    this._mouseDown = false;
    this._handleClick(e);
  }

  onMouseMove(e: MouseEvent): void {
    if (this._mouseDown) return;
    const hit = this.editor.raycast.raycastSurface(e);
    this._updateHover(hit);

    if (this.selectedSurface) {
      const filter = this._cpFilter();
      const vertex = this.editor.raycast.raycastVertex(e, filter);
      this._updateVertexHover(vertex);
    }
  }

  // -------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.selectedVertex) {
        this._deselectVertex();
      } else if (this.selectedSurface) {
        this._deselectSurface();
      }
      return;
    }

    if (!this.selectedSurface) return;
    const patchIdx = this.editor.scene!.surfaces.indexOf(this.selectedSurface);

    if (e.key === 'u' || e.key === 'U') {
      this.editor.scene!.splitIsoline(patchIdx, 'u', 0.5);
      this._deselectSurface();
      this.editor.rebuildAll();
    } else if (e.key === 'v' || e.key === 'V') {
      this.editor.scene!.splitIsoline(patchIdx, 'v', 0.5);
      this._deselectSurface();
      this.editor.rebuildAll();
    } else if (e.key === 'a' || e.key === 'A') {
      this._toggleArcDialog();
    }
  }

  // -------------------------------------------------------------------
  // Cleanup (called when a tool is pushed on top, or on dispose)
  // -------------------------------------------------------------------

  cleanup(): void {
    this._deselectVertex();
    this._deselectCurve();
    this._deselectSurface();
    this._clearHover();
    this._closePropsDialog();
    this._closeEdgeDialog();
    closeArcDialog(this._arcState);
    if (this._gizmo) {
      const ss = this.editor.sceneSetup;
      ss.scene.remove(this._gizmo.gizmo);
      ss.scene.remove(this._gizmo.target);
      this._gizmo.dispose();
      this._gizmo = null;
    }
  }

  // -------------------------------------------------------------------
  // Hover
  // -------------------------------------------------------------------

  private _updateHover(hit: NurbsSurface | null): void {
    if (hit === this.hoveredSurface) return;
    this._clearHover();
    this.hoveredSurface = hit;
    if (hit && !hit.editing) {
      hit.mark(SURFACE_HOVER_COLOR);
      this._markCurves(hit, HOVER_CURVE_COLOR);
      const set = hit.surfaceSet;
      if (set) {
        for (const sibling of set.surfaces) {
          if (sibling !== hit && !sibling.editing) sibling.mark(SURFACE_SET_HOVER_COLOR);
        }
      }
    }
    this.editor.requestRender();
  }

  private _clearHover(): void {
    const hit = this.hoveredSurface;
    if (!hit) return;
    this.hoveredSurface = null;
    if (!hit.editing) {
      hit.unmark();
      this._unmarkCurves(hit);
      const set = hit.surfaceSet;
      if (set) {
        for (const sibling of set.surfaces) {
          if (sibling !== hit && !sibling.editing) sibling.unmark();
        }
      }
    }
  }

  private _hoveredVertex: Vertex | null = null;

  private _updateVertexHover(vertex: Vertex | null): void {
    if (vertex === this._hoveredVertex) return;
    this._hoveredVertex?.setHovered(false);
    this._hoveredVertex = vertex;
    this._hoveredVertex?.setHovered(true);
    this.editor.requestRender();
  }

  // -------------------------------------------------------------------
  // Click handling
  // -------------------------------------------------------------------

  private _handleClick(e: MouseEvent): void {
    // 1. Vertex handle click (only when a surface is in edit mode)
    if (this.selectedSurface) {
      const filter = this._cpFilter();
      const vertex = this.editor.raycast.raycastVertex(e, filter);
      if (vertex && vertex.isSelectable()) {
        if (this.selectedVertex !== vertex) {
          this._deselectVertex();
          this._deselectCurve();
          this._selectVertex(vertex);
        }
        return;
      }
    }

    // 2. BoundingCurve click (only when a surface is in edit mode)
    if (this.selectedSurface) {
      const curve = this.editor.raycast.raycastCurve(e, this.selectedSurface);
      if (curve) {
        this._deselectVertex();
        if (this.selectedCurve !== curve) {
          this._deselectCurve();
          this._selectCurve(curve);
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
          this._deselectVertex();
          return;
        }
        // Otherwise deselect surface.
        this._deselectSurface();
        return;
      }
      // Select a new surface.
      this._deselectVertex();
      this._deselectCurve();
      this._deselectSurface();
      this._selectSurface(hitSurface);
      return;
    }

    // 4. Click on empty space
    if (this.selectedVertex) {
      this._deselectVertex();
    } else if (this.selectedSurface) {
      this._deselectSurface();
    }
  }

  // -------------------------------------------------------------------
  // Selection state transitions
  // -------------------------------------------------------------------

  private _selectSurface(surface: NurbsSurface): void {
    if (this.hoveredSurface === surface) {
      this._clearHover();
    }
    this.selectedSurface = surface;
    surface.enterEditMode();
    const c = surface.boundingCurves;
    c.bottom.select(EDGE_COLORS[0]);
    c.right.select(EDGE_COLORS[1]);
    c.top.select(EDGE_COLORS[2]);
    c.left.select(EDGE_COLORS[3]);
    this._showPropsDialog(surface);
    this.editor.requestRender();
  }

  private _deselectSurface(): void {
    if (!this.selectedSurface) return;
    this._deselectVertex();
    this._deselectCurve();
    const surface = this.selectedSurface;
    this.selectedSurface = null;
    // Release curve select locks.
    const c = surface.boundingCurves;
    c.bottom.deselect();
    c.right.deselect();
    c.top.deselect();
    c.left.deselect();
    surface.exitEditMode();
    this._closePropsDialog();
    this.editor.requestRender();
  }

  private _selectCurve(curve: BoundingCurve): void {
    this.selectedCurve = curve;
    curve.select(EDGE_SELECTED_COLOR);
    this._showEdgeDialog(curve);
    this.editor.requestRender();
  }

  private _deselectCurve(): void {
    if (!this.selectedCurve) return;
    const curve = this.selectedCurve;
    this.selectedCurve = null;
    curve.deselect();
    if (this.selectedSurface) {
      const side = this.selectedSurface.sideOfCurve(curve);
      if (side >= 0) curve.select(EDGE_COLORS[side]);
    }
    this._closeEdgeDialog();
    this.editor.requestRender();
  }

  private _selectVertex(vertex: Vertex): void {
    this._deselectCurve();
    this.selectedVertex = vertex;
    vertex.enterEditMode();
    this._gizmo?.attach(vertex);
    this.editor.requestRender();
  }

  private _deselectVertex(): void {
    if (!this.selectedVertex) return;
    const v = this.selectedVertex;
    this.selectedVertex = null;
    v.exitEditMode();
    this._gizmo?.detach();
    this.editor.requestRender();
  }

  // -------------------------------------------------------------------
  // Curve mark/unmark helpers (tool-owned, not on entity)
  // -------------------------------------------------------------------

  private _markCurves(surface: NurbsSurface, color: number): void {
    surface.boundingCurves.bottom.mark(color);
    surface.boundingCurves.right.mark(color);
    surface.boundingCurves.top.mark(color);
    surface.boundingCurves.left.mark(color);
  }

  private _unmarkCurves(surface: NurbsSurface): void {
    surface.boundingCurves.bottom.unmark();
    surface.boundingCurves.right.unmark();
    surface.boundingCurves.top.unmark();
    surface.boundingCurves.left.unmark();
  }

  // -------------------------------------------------------------------
  // Props dialog
  // -------------------------------------------------------------------

  private _showPropsDialog(surface: NurbsSurface): void {
    this._closePropsDialog();
    const scene = this.editor.scene!;
    const patchIdx = scene.surfaces.indexOf(surface);
    this._propsPanel = showNurbsSurfaceDialog(surface, patchIdx, {
      onClose: () => this._deselectSurface(),
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
        this._deselectSurface();
        this.editor.rebuildAll();
      },
      onRemove: () => {
        scene.removeSurface(surface);
        this._deselectSurface();
        this.editor.rebuildAll();
      },
    });
  }

  private _closePropsDialog(): void {
    closeNurbsSurfaceDialog(this._propsPanel);
    this._propsPanel = null;
  }

  // -------------------------------------------------------------------
  // Edge dialog
  // -------------------------------------------------------------------

  private _showEdgeDialog(curve: BoundingCurve): void {
    this._closeEdgeDialog();
    const surface = this.selectedSurface!;
    const scene = this.editor.scene!;
    const patchIdx = scene.surfaces.indexOf(surface);
    const edgeIdx = surface.sideOfCurve(curve);
    const adj = scene.findAdjacentPatches(patchIdx);
    const hasNeighbor = adj.some((a: any) => a.side === edgeIdx);

    const rebuildAndReopen = () => {
      this.editor.rebuildAll();
      this._showEdgeDialog(curve);
    };

    this._edgePanel = showEdgeDialog(curve, hasNeighbor, {
      onClose: () => this._deselectCurve(),
      onArc90Out: () => {
        this._applyArc90(patchIdx, edgeIdx, false);
        rebuildAndReopen();
      },
      onArc90In: () => {
        this._applyArc90(patchIdx, edgeIdx, true);
        rebuildAndReopen();
      },
      onRemoveArc: () => {
        this._removeArc(patchIdx, edgeIdx);
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

  private _closeEdgeDialog(): void {
    closeBoundingCurveDialog(this._edgePanel);
    this._edgePanel = null;
  }

  private _applyArc90(patchIdx: number, side: number, flip: boolean): void {
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

  private _removeArc(patchIdx: number, edgeIdx: number): void {
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

  private _toggleArcDialog(): void {
    if (!this.selectedSurface) return;
    if (this._arcState.panel) {
      closeArcDialog(this._arcState);
      return;
    }
    const scene = this.editor.scene!;
    const patchIdx = scene.surfaces.indexOf(this.selectedSurface);
    const result = showArcDialog(scene, patchIdx, {
      onClose: () => closeArcDialog(this._arcState),
      onRemove: () => {
        if (scene.arcConstraints.length > 0) {
          scene.removeArcConstraint(scene.arcConstraints[scene.arcConstraints.length - 1]);
        }
        this.editor.rebuildAll();
        closeArcDialog(this._arcState);
      },
      onApply: () => {
        this.editor.rebuildAll();
      },
    });
    this._arcState.panel = result.panel;
  }

  /** Build the filter set of grid CPs for the selected surface. */
  private _cpFilter(): Set<Vertex> {
    const allowed = new Set<Vertex>();
    if (this.selectedSurface) {
      for (const row of this.selectedSurface.grid) {
        for (const cp of row) allowed.add(cp);
      }
    }
    return allowed;
  }
}
