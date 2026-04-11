/**
 * SubcageObject3D — the visible 4×4 control-point cage overlay that appears
 * when a NurbsSurface is selected.
 *
 * Encapsulates:
 *   - 16 CP handles (small visible sphere + invisible picker sphere)
 *   - 8 grid lines (4 horizontal + 4 vertical)
 *   - 4 cubic-Bézier boundary edge polylines (ScalableLines)
 *
 * Selection state is NOT owned here — callers pass in callbacks:
 *   - onHandleClicked(handle) — user clicked a CP picker
 *   - onEdgeClicked(edgeIdx)  — user clicked a boundary edge
 * Everything else (gizmo attach, edge dialog, arc overlay, etc.) stays on
 * the caller so this class remains reusable.
 */
import {
  Group, Mesh, BufferGeometry, BufferAttribute, Line,
} from 'three';
import {ConstantScaleGroup} from 'scene/scaleHelper';
import ScalableLine from 'scene/objects/scalableLine';
import {
  sharedSphereGeometry,
  createControlPointMaterial,
  createPickerMaterial,
  createCageLineMaterial,
  tessellateCubicBezier,
  CP_COLOR, CP_HOVER_COLOR, CP_MIRROR_COLOR, CP_SELECTED_COLOR,
  EDGE_COLORS, EDGE_SELECTED_COLOR,
  HANDLE_SIZE, CP_VISUAL_SCALE, CP_PICKER_SCALE, EDGE_WIDTH,
} from './index';
import {select} from './selection';
import type {Selectable} from './EntityObject3D';

const EDGE_SEGMENTS = 24;

// Structural types so we don't pull entity modules into three/
interface VertexLike {
  position: number[];
}
interface SurfaceLike {
  grid: VertexLike[][];
  /** Optional: when present, edge polylines reuse the cached mesh
   *  tessellation so subcage edges align exactly with the shaded mesh. */
  getEdgePolyline?: (side: number, resolution: number) => number[][];
}
interface MirrorAware {
  isMirrorTarget(v: VertexLike): boolean;
}

export interface SubcageHandle extends Group {
  userData: any;
  __mat: any;
  /** The Selectable adapter that is published to selection$ on click. */
  selectable: any;
}

/**
 * A thin Selectable/CPSelectable adapter per subcage handle. Published to
 * selection$ when the user clicks the handle, so SelectionGizmoOverlay can
 * attach to its controlPoint.vertex.
 */
export class CPSelectableAdapter implements Selectable {
  controlPoint: {vertex: VertexLike};
  handle: SubcageHandle;
  private _selected = false;
  private _onSelectedChanged: (sel: boolean) => void;
  private _isSelectable: () => boolean;

  constructor(
    vertex: VertexLike,
    handle: SubcageHandle,
    isSelectable: () => boolean,
    onSelectedChanged: (sel: boolean) => void,
  ) {
    this.controlPoint = {vertex};
    this.handle = handle;
    this._isSelectable = isSelectable;
    this._onSelectedChanged = onSelectedChanged;
  }

  get selected(): boolean { return this._selected; }
  isSelectable(): boolean { return this._isSelectable(); }
  setSelected(sel: boolean): void {
    if (this._selected === sel) return;
    this._selected = sel;
    this._onSelectedChanged(sel);
  }
}

export interface SubcageCallbacks {
  /** Fired after an edge line is clicked. */
  onEdgeClicked: (edgeIdx: number) => void;
  /** Fired when the selected CP changes (via selection$) so callers can
   *  react — update dialogs, etc. */
  onHandleSelectionChanged?: (handle: SubcageHandle | null) => void;
  requestRender: () => void;
}

export class SubcageObject3D extends Group {

  readonly handles: SubcageHandle[] = [];
  readonly edgeLines: any[] = [];

  private surface: SurfaceLike;
  private sceneSetup: any;
  private mirrorAware: MirrorAware;
  private callbacks: SubcageCallbacks;
  private meshResolution: number;
  private lineMaterial = createCageLineMaterial();

  constructor(
    surface: SurfaceLike,
    sceneSetup: any,
    mirrorAware: MirrorAware,
    callbacks: SubcageCallbacks,
    meshResolution: number = 8,
  ) {
    super();
    this.surface = surface;
    this.sceneSetup = sceneSetup;
    this.mirrorAware = mirrorAware;
    this.callbacks = callbacks;
    this.meshResolution = meshResolution;
    this.rebuild();
  }

  /** Rebuild everything from the current grid. Called on construction and
   *  after any structural change (e.g. split, subdivide). */
  rebuild(): void {
    this.clearAll();
    this.buildHandles();
    this.buildGridLines();
    this.buildBoundaryEdges();
  }

  /**
   * Update handle positions in-place (called from the drag path). Doesn't
   * rebuild meshes — just moves handle groups to follow their vertices.
   */
  syncHandlePositions(): void {
    for (const h of this.handles) {
      const cv = h.userData.cageVertex;
      if (!cv) continue;
      const p = cv.position;
      h.position.set(p[0], p[1], p[2]);
    }
  }

  /** Visually mark a handle as selected (full scale + red). */
  selectHandle(handle: SubcageHandle): void {
    handle.__mat.color.setHex(CP_SELECTED_COLOR);
    if (handle.userData.sphere) handle.userData.sphere.scale.setScalar(CP_PICKER_SCALE);
  }

  /** Restore a handle to its base color + small scale. */
  deselectHandle(handle: SubcageHandle): void {
    handle.__mat.color.setHex(handle.userData.baseColor);
    if (handle.userData.sphere) handle.userData.sphere.scale.setScalar(CP_VISUAL_SCALE);
  }

  /** Color the N-th edge line as selected / base. */
  selectEdge(edgeIdx: number): void {
    const line = this.edgeLines[edgeIdx];
    if (!line) return;
    line.material.color.setHex(EDGE_SELECTED_COLOR);
    line.material.linewidth = 6;
  }

  deselectEdge(edgeIdx: number): void {
    const line = this.edgeLines[edgeIdx];
    if (!line) return;
    line.material.color.setHex(line.userData.baseColor);
    line.material.linewidth = EDGE_WIDTH;
  }

  dispose(): void {
    this.clearAll();
    this.lineMaterial.dispose();
  }

  // ---- Internals ----------------------------------------------------------

  private clearAll(): void {
    while (this.children.length > 0) {
      const c: any = this.children[0];
      this.remove(c);
      if (c.geometry) c.geometry.dispose();
      // Note: materials are shared (lineMaterial) or CP-specific (disposed
      // below). Boundary ScalableLines own their own material — dispose.
      if (c.material && c.material !== this.lineMaterial) {
        try { c.material.dispose(); } catch {}
      }
    }
    this.handles.length = 0;
    this.edgeLines.length = 0;
  }

  private buildHandles(): void {
    const ctrl = this.surface.grid;
    const ss = this.sceneSetup;
    const self = this;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cv = ctrl[row][col];
        const p = cv.position;
        const isMirrorTarget = this.mirrorAware.isMirrorTarget(cv);
        const baseColor = isMirrorTarget ? CP_MIRROR_COLOR : CP_COLOR;

        const mat = createControlPointMaterial(baseColor);
        const sphere = new Mesh(sharedSphereGeometry, mat);
        sphere.renderOrder = 2;
        sphere.scale.setScalar(CP_VISUAL_SCALE);

        const pickerMat = createPickerMaterial();
        const picker = new Mesh(sharedSphereGeometry, pickerMat);
        picker.renderOrder = 2;
        picker.scale.setScalar(CP_PICKER_SCALE);

        const handle = new ConstantScaleGroup(ss, HANDLE_SIZE * 2, 1, () => handle.position) as unknown as SubcageHandle;
        handle.position.set(p[0], p[1], p[2]);
        handle.add(sphere);
        handle.add(picker);
        handle.userData = {row, col, baseColor, cageVertex: cv, sphere};
        handle.__mat = mat;

        // Selectable adapter — published to selection$ on click, consumed
        // by SelectionGizmoOverlay (or anything listening).
        handle.selectable = new CPSelectableAdapter(
          cv,
          handle,
          () => !this.mirrorAware.isMirrorTarget(cv),
          (sel) => {
            if (sel) {
              handle.__mat.color.setHex(CP_SELECTED_COLOR);
              sphere.scale.setScalar(CP_PICKER_SCALE);
              handle.userData.selected = true;
            } else {
              handle.__mat.color.setHex(handle.userData.baseColor);
              sphere.scale.setScalar(CP_VISUAL_SCALE);
              handle.userData.selected = false;
            }
            if (self.callbacks.onHandleSelectionChanged) {
              self.callbacks.onHandleSelectionChanged(sel ? handle : null);
            }
            self.callbacks.requestRender();
          },
        );

        (picker as any).onMouseEnter = () => {
          if (handle.userData.selected !== true) mat.color.setHex(CP_HOVER_COLOR);
          self.callbacks.requestRender();
        };
        (picker as any).onMouseLeave = () => {
          if (handle.userData.selected !== true) mat.color.setHex(baseColor);
          self.callbacks.requestRender();
        };
        (picker as any).onMouseClick = () => select(handle.selectable);

        this.add(handle);
        this.handles.push(handle);
      }
    }
  }

  private buildGridLines(): void {
    const ctrl = this.surface.grid;

    // Horizontal
    for (let row = 0; row < 4; row++) {
      const pts = new Float32Array(4 * 3);
      for (let col = 0; col < 4; col++) {
        const p = ctrl[row][col].position;
        pts[col * 3]     = p[0];
        pts[col * 3 + 1] = p[1];
        pts[col * 3 + 2] = p[2];
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pts, 3));
      this.add(new Line(g, this.lineMaterial));
    }

    // Vertical
    for (let col = 0; col < 4; col++) {
      const pts = new Float32Array(4 * 3);
      for (let row = 0; row < 4; row++) {
        const p = ctrl[row][col].position;
        pts[row * 3]     = p[0];
        pts[row * 3 + 1] = p[1];
        pts[row * 3 + 2] = p[2];
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pts, 3));
      this.add(new Line(g, this.lineMaterial));
    }
  }

  private buildBoundaryEdges(): void {
    const ctrl = this.surface.grid;
    const ss = this.sceneSetup;

    const self = this;
    for (let ei = 0; ei < 4; ei++) {
      // Reuse the mesh tessellation when the surface exposes it — the
      // boundary edge sample points are then identical to the mesh's
      // boundary vertices, so the edge line never drifts from the shaded
      // surface. Fall back to a pure curve tessellation when not available.
      let pts: number[][];
      if (this.surface.getEdgePolyline) {
        pts = this.surface.getEdgePolyline(ei, this.meshResolution);
      } else {
        const edgeVertSets: [number, number][][] = [
          [[0,0],[0,1],[0,2],[0,3]],  // bottom
          [[0,3],[1,3],[2,3],[3,3]],  // right
          [[3,0],[3,1],[3,2],[3,3]],  // top
          [[0,0],[1,0],[2,0],[3,0]],  // left
        ];
        const evs = edgeVertSets[ei];
        const cps = evs.map(([r, c]) => ctrl[r][c].position as any);
        pts = tessellateCubicBezier(cps, EDGE_SEGMENTS);
      }

      const baseColor = EDGE_COLORS[ei];
      const line: any = new ScalableLine(ss, pts, EDGE_WIDTH, baseColor);
      line.material.depthTest = false;
      line.material.transparent = true;
      line.material.opacity = 0.9;
      line.renderOrder = 1;
      line.userData = {edgeIdx: ei, baseColor};
      line.onMouseClick = () => self.callbacks.onEdgeClicked(ei);

      this.add(line);
      this.edgeLines.push(line);
    }
  }
}
