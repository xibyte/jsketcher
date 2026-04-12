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
import {SURFACE_HOVER_COLOR, EDGE_COLORS} from '../three';

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

  init(editor: SurfacingEditor): void {
    this.editor = editor;
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
      this.editor.persistCageState();
    } else if (e.key === 'v' || e.key === 'V') {
      this.editor.scene!.splitIsoline(patchIdx, 'v', 0.5);
      this._deselectSurface();
      this.editor.rebuildAll();
      this.editor.persistCageState();
    } else if (e.key === 'a' || e.key === 'A') {
      this.editor.showArcDialog();
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
    // Clear hover on the target first so edit-mode visuals start clean.
    if (this.hoveredSurface === surface) {
      this._clearHover();
    }
    this.selectedSurface = surface;
    surface.enterEditMode();
    // Mark 4 curves side-colored (select-locked so hover can't override).
    const c = surface.boundingCurves;
    c.bottom.select(EDGE_COLORS[0]);
    c.right.select(EDGE_COLORS[1]);
    c.top.select(EDGE_COLORS[2]);
    c.left.select(EDGE_COLORS[3]);
    this.editor.showPropsDialog(surface);
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
    this.editor.closePropsDialog();
    this.editor.requestRender();
  }

  private _selectCurve(curve: BoundingCurve): void {
    this.selectedCurve = curve;
    curve.select(EDGE_SELECTED_COLOR);
    const surface = this.selectedSurface!;
    const side = surface.sideOfCurve(curve);
    if (side >= 0) this.editor.showEdgeDialog(side);
    this.editor.requestRender();
  }

  private _deselectCurve(): void {
    if (!this.selectedCurve) return;
    const curve = this.selectedCurve;
    this.selectedCurve = null;
    // Release the select lock and re-apply the side color.
    curve.deselect();
    if (this.selectedSurface) {
      const side = this.selectedSurface.sideOfCurve(curve);
      if (side >= 0) curve.select(EDGE_COLORS[side]);
    }
    this.editor.closeEdgeDialog();
    this.editor.requestRender();
  }

  private _selectVertex(vertex: Vertex): void {
    this._deselectCurve();
    this.selectedVertex = vertex;
    vertex.enterEditMode();
    this.editor.attachGizmo(vertex);
    this.editor.requestRender();
  }

  private _deselectVertex(): void {
    if (!this.selectedVertex) return;
    const v = this.selectedVertex;
    this.selectedVertex = null;
    v.exitEditMode();
    this.editor.detachGizmo();
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
