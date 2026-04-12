// @ts-nocheck
import {SURFACING_SCENE} from 'cad/model/entities';
import {setAttribute} from 'scene/objectData';
import {Group} from 'three';
import {distance as vdist, lerp as vlerp} from 'math/vec';
import {SelectionGizmoOverlay} from './three';
import {Vertex} from './models/Vertex/Vertex.entity';
import type {NurbsSurface} from './models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from './models/BoundingCurve/BoundingCurve.entity';
import type {Scene} from './models/Scene/Scene.entity';
import {surfacingViewFlags$} from './surfacingViewFlags';
import type {Tool} from './tool';
import {DefaultTool} from './tools/defaultTool';
import {RaycastService} from './RaycastService';

// bottom, right, top, left — used by showEdgeDialog for the edge colour swatch
const EDGE_COLORS = [0x2277ee, 0x22bb44, 0xdd3333, 0xddaa22];

/**
 * SurfacingEditor — tool host and service layer for one Scene.
 *
 * Owns: a tool stack, the shared gizmo, DOM event dispatching, dialog
 * plumbing, raycast helpers, and the overlays Group. ALL per-mode state
 * (hover, selection, bridge picks, fill-hole loops) lives on the active
 * Tool, never on the editor itself.
 *
 * Implements SurfacingContext so entities can reference `this` as their
 * `ctx` without importing the full editor class.
 */
export class SurfacingEditor {

  scene: Scene | null = null;
  readonly workingGroup: Group;
  readonly sceneSetup: any;
  readonly viewFlags$: any; // StateStream<SurfacingViewFlags>
  readonly ctx: any;
  marks: any[] = [];
  _disposers: (() => void)[] = [];

  // Tool stack — DefaultTool is always at index 0.
  private _tools: Tool[] = [];

  // Dynamic properties (gizmo, dialog refs, overlay groups)
  [key: string]: any;

  get currentTool(): Tool { return this._tools[this._tools.length - 1]; }

  constructor(workingGroup: Group, sceneSetup: any, viewFlags$: any, ctx: any) {
    this.ctx = ctx;
    this.workingGroup = workingGroup;
    this.sceneSetup = sceneSetup;
    this.viewFlags$ = viewFlags$;

    this.overlaysGroup = new Group();
    setAttribute(this.overlaysGroup, SURFACING_SCENE, this);
    this.workingGroup.add(this.overlaysGroup);
    this.surfaceMeshes = [];
    this.raycast = new RaycastService(this);

    this._selectionGizmo = null;

    // DOM event listeners — thin dispatch to currentTool.
    this._clickStartX = 0;
    this._clickStartY = 0;
    const dom = ctx.viewer.sceneSetup.renderer.domElement;
    this._onMouseDown = (e) => {
      this._clickStartX = e.offsetX;
      this._clickStartY = e.offsetY;
      this.currentTool.onMouseDown(e);
    };
    this._onMouseUp = (e) => {
      const dx = Math.abs(e.offsetX - this._clickStartX);
      const dy = Math.abs(e.offsetY - this._clickStartY);
      if (dx < 3 && dy < 3 && e.button === 0) {
        this.currentTool.onMouseUp(e);
      }
    };
    this._onMouseMove = (e) => {
      this.currentTool.onMouseMove(e);
    };
    dom.addEventListener('mousedown', this._onMouseDown);
    dom.addEventListener('mouseup', this._onMouseUp);
    dom.addEventListener('mousemove', this._onMouseMove);

    this._onKeyDown = (e) => {
      this.currentTool.onKeyDown(e);
    };
    document.addEventListener('keydown', this._onKeyDown);

    // Toolbar toggle events — push/pop tools
    this._onLoopToggle = () => {
      const {LoopInsertTool} = require('./ops/split/split.tool');
      if (this.currentTool instanceof LoopInsertTool) {
        this.popTool();
      } else {
        this.pushTool(new LoopInsertTool());
      }
    };
    document.addEventListener('patch-insert-loop-toggle', this._onLoopToggle);

    this._onBridgeToggle = () => {
      // Lazy-import to avoid circular deps at module load time.
      const {BridgeTool} = require('./ops/bridge/bridge.tool');
      if (this.currentTool instanceof BridgeTool) {
        this.popTool();
      } else {
        this.pushTool(new BridgeTool());
      }
    };
    document.addEventListener('patch-bridge-toggle', this._onBridgeToggle);

    this._onFillHoleToggle = () => {
      const {FillHoleTool} = require('./ops/fillHole/fillHole.tool');
      if (this.currentTool instanceof FillHoleTool) {
        this.popTool();
      } else {
        this.pushTool(new FillHoleTool());
      }
    };
    document.addEventListener('patch-fill-hole-toggle', this._onFillHoleToggle);

    this._onConstraintDeleted = () => {
      this.rebuildAll();
      this.persistCageState();
      this.requestRender();
    };
    document.addEventListener('patch-cage-constraint-deleted', this._onConstraintDeleted);

    this._disposers.push(surfacingViewFlags$.attach(() => {
      ctx.viewer.requestRender();
    }));

    // Push the default tool as the bottom of the stack.
    this.pushTool(new DefaultTool());
  }

  requestRender(): void {
    this.ctx.viewer.requestRender();
  }

  /**
   * Attach a scene to this editor. Called after deserialization or when
   * a primitive is first added. Sets up the gizmo and refreshes entity
   * refs. The editor can exist without a scene (empty workspace).
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.surfaceMeshes = scene.surfaces.map(s => s.object3d);
    // Gizmo needs the scene for moveVertex on drag.
    if (!this._selectionGizmo) this.setupGizmo();
    else this._selectionGizmo.setScene(scene);
    // Highlight service hook for the explorer panel.
    this.overlaysGroup.onMouseEnter = () => this.ctx.highlightService?.highlight(scene.id);
    this.overlaysGroup.onMouseLeave = () => this.ctx.highlightService?.unHighlight(scene.id);
  }

  // ---- Tool stack ----

  pushTool(tool: Tool): void {
    if (this._tools.length > 0) this.currentTool.cleanup();
    tool.init(this);
    this._tools.push(tool);
  }

  popTool(): void {
    if (this._tools.length <= 1) throw new Error('Cannot pop the default tool');
    this.currentTool.cleanup();
    this._tools.pop();
    this.currentTool.init(this);
  }

  // ---- Gizmo ----

  attachGizmo(vertex: Vertex): void {
    this._selectionGizmo?.attach(vertex);
  }

  detachGizmo(): void {
    this._selectionGizmo?.detach();
  }

  // View-like interface for highlight system
  mark(type = 'selection') {
    this.marks.push({type});
    this.updateVisuals();
  }

  withdraw(type = 'selection') {
    this.marks = this.marks.filter(m => m.type !== type);
    this.updateVisuals();
  }

  /** Backward-compat getter that reads from the DefaultTool's state. */
  get selectedPatchIdx(): number {
    const dt = this._tools[0] as any;
    const sel = dt?.selectedSurface;
    return sel ? this.scene.surfaces.indexOf(sel) : -1;
  }

  /** Current selection — read from the DefaultTool at the bottom of the stack. */
  get selection(): NurbsSurface | null {
    const dt = this._tools[0] as any;
    return dt?.selectedSurface ?? null;
  }

  // ---- Gizmo setup ----

  setupGizmo() {
    const ss = this.ctx.viewer.sceneSetup;

    // One shared SelectionGizmoOverlay, attached imperatively by the editor
    // adapter when Vertex.select() fires. No stream subscription — the
    // editor owns the lifecycle.
    this._selectionGizmo = new SelectionGizmoOverlay(ss, this.scene, {
      onChange: () => {
        if (!this._timer) {
          this._timer = requestAnimationFrame(() => {
            this._timer = null;
            this.refreshOverlaysForDrag();
          });
        }
      },
      onDragEnd: () => {
        this.rebuildAll();
        this.persistCageState();
      },
    });
    ss.scene.add(this._selectionGizmo.gizmo);
    ss.scene.add(this._selectionGizmo.target);
  }

  showEdgeDialog(edgeIdx) {
    this.closeEdgeDialog();
    const sideNames = ['Bottom', 'Right', 'Top', 'Left'];

    const patch = this.scene.surfaces[this.selectedPatchIdx];
    const verts = patch.getEdgeVertices(edgeIdx);
    const p0 = verts[0].position, p3 = verts[3].position;
    const chordLen = vdist(p0, p3);
    const round = (v) => Math.round(v * 1e4) / 1e4;

    // Check if this edge already has an arc constraint
    const scene = this.scene;
    const existing = scene.arcConstraints.find(c =>
      c.patchSide && c.patchSide.patchIdx === this.selectedPatchIdx && c.patchSide.side === edgeIdx
    );

    // Check if edge has adjacent patch (for continuity)
    const adj = scene.findAdjacentPatches(this.selectedPatchIdx);
    const hasNeighbor = adj.some(a => a.side === edgeIdx);

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:10px;bottom:10px;background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:340px;font-family:sans-serif;font-size:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:bold;">${sideNames[edgeIdx]} Edge</span>
        <button id="edge-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
      </div>
      <div style="margin-bottom:8px;font-size:11px;color:#888;">
        Chord length: ${round(chordLen)}${hasNeighbor ? ' | Shared' : ' | Free'}
        ${existing ? ' | Arc: ' + round(existing.angle) + '° r=' + round(existing.radius) + ' (' + existing.mode + ')' : ''}
      </div>
      <div style="display:flex;gap:6px;">
        <button id="edge-arc90-out" style="flex:1;padding:6px;background:#353;color:#eee;border:none;border-radius:4px;cursor:pointer;">Arc 90° Out</button>
        <button id="edge-arc90-in" style="flex:1;padding:6px;background:#345;color:#eee;border:none;border-radius:4px;cursor:pointer;">Arc 90° In</button>
        ${existing ? '<button id="edge-remove-arc" style="flex:1;padding:6px;background:#533;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove</button>' : ''}
      </div>
      ${hasNeighbor ? `
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="edge-g1" style="flex:1;padding:6px;background:#446;color:#eee;border:none;border-radius:4px;cursor:pointer;">G1 Tangent</button>
        <button id="edge-g2" style="flex:1;padding:6px;background:#464;color:#eee;border:none;border-radius:4px;cursor:pointer;">G2 Curvature</button>
      </div>` : ''}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="edge-mirror" style="flex:1;padding:6px;background:#556;color:#eee;border:none;border-radius:4px;cursor:pointer;">Mirror</button>
      </div>
    `;

    document.body.appendChild(panel);
    this._edgeDialog = panel;

    panel.querySelector('#edge-close').onclick = () => this.deselectEdge();

    const applyArc90 = (flip) => {
      const patchIdx = this.selectedPatchIdx;
      const side = edgeIdx;
      const ptch = this.scene.surfaces[patchIdx];
      const ev = ptch.getEdgeVertices(side);

      const chord = vdist(ev[0].position, ev[3].position);
      const radius = chord / Math.SQRT2;

      let u = 0.5, v = 0.5;
      if (side === 0) v = 0;
      else if (side === 1) u = 1;
      else if (side === 2) v = 1;
      else if (side === 3) u = 0;
      let planeNormal = ptch.normal(u, v);
      if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]];

      scene.arcConstraints = scene.arcConstraints.filter(c => {
        if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
          // `rational` is derived; the following constrainEdgeToArc rewrites
          // edge CP weights to match the new mode.
          return false;
        }
        return true;
      });

      scene.constrainEdgeToArc(patchIdx, side, radius, 90, planeNormal, 'rational');
      ;
      this.rebuildAll();
      this.persistCageState();
      this.showEdgeDialog(edgeIdx);
    };
    panel.querySelector('#edge-arc90-out').onclick = () => applyArc90(false);
    panel.querySelector('#edge-arc90-in').onclick = () => applyArc90(true);

    const removeBtn = panel.querySelector('#edge-remove-arc');
    if (removeBtn) {
      removeBtn.onclick = () => {
        scene.arcConstraints = scene.arcConstraints.filter(c => {
          if (c.patchSide && c.patchSide.patchIdx === this.selectedPatchIdx && c.patchSide.side === edgeIdx) {
            // Reset interior control points to linear interpolation
            const ev = this.scene.surfaces[this.selectedPatchIdx].getEdgeVertices(edgeIdx);
            const lp1 = vlerp(ev[0].position, ev[3].position, 1/3);
            const lp2 = vlerp(ev[0].position, ev[3].position, 2/3);
            ev[1].set(lp1[0], lp1[1], lp1[2]);
            ev[2].set(lp2[0], lp2[1], lp2[2]);
            return false;
          }
          return true;
        });
        // Reset every control point weight on the selected patch back to 1.
        const selPatch = this.scene.surfaces[this.selectedPatchIdx];
        for (const row of selPatch.grid) {
          for (const cp of row) cp.weight.value = 1;
        }
        ;
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }

    const g1Btn = panel.querySelector('#edge-g1');
    if (g1Btn) {
      g1Btn.onclick = () => {
        scene.applyG1(this.selectedPatchIdx, edgeIdx);
        ;
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }
    const g2Btn = panel.querySelector('#edge-g2');
    if (g2Btn) {
      g2Btn.onclick = () => {
        scene.applyG2(this.selectedPatchIdx, edgeIdx);
        ;
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }

    const mirrorBtn = panel.querySelector('#edge-mirror');
    if (mirrorBtn) {
      mirrorBtn.onclick = () => {
        scene.mirrorAcrossEdge(this.selectedPatchIdx, edgeIdx);
        ;
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }
  }

  closeEdgeDialog() {
    if (this._edgeDialog) {
      document.body.removeChild(this._edgeDialog);
      this._edgeDialog = null;
    }
  }

  // ---- Entity view bookkeeping ----------------------------------------

  /**
   * After a structural op (split / subdivide / fill …) the scene's
   * surface list may have changed. Refresh external references
   * (surfaceMeshes index, click handlers) and propagate mirror-target
   * colouring; no actual view construction happens here anymore —
   * entity constructors did that already.
   */
  _refreshEntityRefs() {
    const scene = this.scene;
    if (!scene) return;
    this.surfaceMeshes = scene.surfaces.map(s => s.object3d);
    for (const surface of scene.surfaces) {
      for (const row of surface.grid) {
        for (const cp of row) cp.setMirrorTarget(scene.isMirrorTarget(cp));
      }
    }
  }

  /**
   * Refresh the scene-level overlays that aren't yet owned by individual
   * entities (wireframe UV grid, edges, boundaries) and update subcage
   * handle positions after a drag.
   *
   * Per-surface retessellation is NOT done here — Vertex.set() already
   * notifies every dependent NurbsSurface via the usedBy back-reference,
   * and each surface calls its own object3d.rebuild(). This method just
   * keeps the scene-level decorations in sync.
   */
  refreshOverlaysForDrag(): void {
    if (!this.scene) return;

    const patch = this.selection;
    if (patch) {
      const cageView: any = patch.cage?.object3d;
      if (cageView && typeof cageView.sync === 'function') cageView.sync();
      // Refresh the 4 bounding curves so their lines track the new geometry.
      patch.boundingCurves.bottom.refreshGeometry();
      patch.boundingCurves.right.refreshGeometry();
      patch.boundingCurves.top.refreshGeometry();
      patch.boundingCurves.left.refreshGeometry();
    }

    this.ctx.viewer.requestRender();
  }

  // ---- Rebuild ----

  rebuildAll() {
    // Cleanup the current tool and re-init it after refreshing refs.
    // This ensures the tool's state stays consistent with the new
    // entity graph (e.g. after a split or subdivide).
    this.currentTool.cleanup();
    this._refreshEntityRefs();
    this.currentTool.init(this);
    this.ctx.viewer.requestRender();
  }

  // ---- Arc Constraint Dialog ----

  showArcDialog() {
    if (this.selectedPatchIdx < 0) return;
    if (this._arcDialog) { this.closeArcDialog(); return; }

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;left:10px;top:50%;transform:translateY(-50%);background:#2a2a2a;color:#eee;padding:16px;border-radius:8px;width:220px;font-family:sans-serif;font-size:13px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
    panel.innerHTML = `
      <div style="font-size:14px;font-weight:bold;margin-bottom:10px;">Arc Constraint</div>
      <div style="margin-bottom:6px;">
        <label>Edge</label>
        <select id="arc-side" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;">
          <option value="0">Bottom</option>
          <option value="1">Right</option>
          <option value="2">Top</option>
          <option value="3">Left</option>
        </select>
      </div>
      <div style="margin-bottom:6px;">
        <label>Radius</label>
        <input id="arc-radius" type="number" value="50" step="1" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;" />
      </div>
      <div style="margin-bottom:6px;">
        <label>Flip</label>
        <input id="arc-flip" type="checkbox" style="margin-left:8px;" />
      </div>
      <div style="margin-bottom:10px;">
        <label>Mode</label>
        <select id="arc-mode" style="width:100%;padding:3px;background:#333;color:#eee;border:1px solid #555;margin-top:2px;">
          <option value="approximate">Approximate (Bézier)</option>
          <option value="rational" selected>Rational (Exact NURBS)</option>
        </select>
      </div>
      <div style="display:flex;gap:6px;">
        <button id="arc-close" style="flex:1;padding:5px;background:#555;color:#eee;border:none;border-radius:4px;cursor:pointer;">Close</button>
        <button id="arc-remove" style="flex:1;padding:5px;background:#884444;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove</button>
      </div>
    `;

    document.body.appendChild(panel);
    this._arcDialog = panel;
    this._arcPatchIdx = this.selectedPatchIdx;
    this._arcDebounce = null;

    const applyLive = () => {
      if (this._arcDebounce) cancelAnimationFrame(this._arcDebounce);
      this._arcDebounce = requestAnimationFrame(() => {
        this._arcDebounce = null;
        this.applyArcFromDialog();
      });
    };

    panel.querySelector('#arc-side').oninput = applyLive;
    panel.querySelector('#arc-radius').oninput = applyLive;
    panel.querySelector('#arc-flip').oninput = applyLive;
    panel.querySelector('#arc-mode').oninput = applyLive;

    panel.querySelector('#arc-close').onclick = () => this.closeArcDialog();
    panel.querySelector('#arc-remove').onclick = () => {
      // Remove last constraint and revert
      const scene = this.scene;
      if (scene.arcConstraints.length > 0) {
        scene.removeArcConstraint(scene.arcConstraints[scene.arcConstraints.length - 1]);
      }
      ;
      this.rebuildAll();
      this.persistCageState();
      this.closeArcDialog();
    };

    // Apply immediately with defaults
    applyLive();
  }

  applyArcFromDialog() {
    if (!this._arcDialog) return;
    const panel = this._arcDialog;
    const patchIdx = this._arcPatchIdx;

    const side = parseInt(panel.querySelector('#arc-side').value);
    const radius = parseFloat(panel.querySelector('#arc-radius').value);
    const flip = panel.querySelector('#arc-flip').checked;
    const mode = panel.querySelector('#arc-mode').value;

    if (isNaN(radius) || radius <= 0) return;

    const scene = this.scene;
    const patch = scene.surfaces[patchIdx];
    if (!patch) return;

    // Compute angle from radius and chord length
    const edgeVerts = patch.getEdgeVertices(side);
    const p0 = edgeVerts[0].position;
    const p3 = edgeVerts[3].position;
    const chordLen = vdist(p0, p3);

    // For a circular arc: chord = 2 * r * sin(θ/2)
    // → sin(θ/2) = chord / (2r)
    // If chord > 2r, arc is impossible
    const sinHalf = Math.min(1, chordLen / (2 * radius));
    const angle = 2 * Math.asin(sinHalf) * (180 / Math.PI);

    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    let planeNormal = patch.normal(u, v);
    if (flip) planeNormal = [-planeNormal[0], -planeNormal[1], -planeNormal[2]];

    // Remove previous constraint on this edge if exists
    scene.arcConstraints = scene.arcConstraints.filter(c => {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
        // `rational` is derived; constrainEdgeToArc below rewrites edge weights.
        return false;
      }
      return true;
    });

    scene.constrainEdgeToArc(patchIdx, side, radius, angle, planeNormal, mode);
    this.rebuildAll();
    this.persistCageState();
  }

  closeArcDialog() {
    if (this._arcDialog) {
      document.body.removeChild(this._arcDialog);
      this._arcDialog = null;
    }
    if (this._arcDebounce) {
      cancelAnimationFrame(this._arcDebounce);
      this._arcDebounce = null;
    }
  }

  // ---- Patch Properties Dialog ----

  showPropsDialog(patch: NurbsSurface) {
    this.closePropsDialog();

    const scene = this.scene;
    const patchIdx = scene.surfaces.indexOf(patch);

    const round = (v) => Math.round(v * 1e6) / 1e6;
    const fmtVec = (p) => [round(p[0]), round(p[1]), round(p[2])];

    // Control points as 4x4 array of [x,y,z]
    const controlPoints = patch.grid.map(row => row.map(v => fmtVec(v.position)));

    // Weights (derived from per-vertex ControlPoints)
    const weights = patch.getWeightsMatrix().map(row => row.map(w => round(w)));

    // Knots (uniform clamped cubic: [0,0,0,0,1,1,1,1])
    const knots = [0, 0, 0, 0, 1, 1, 1, 1];

    // Edge constraints on this patch
    const sideNames = ['bottom', 'right', 'top', 'left'];
    const constraints = [];
    for (const c of scene.arcConstraints) {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx) {
        constraints.push({
          edge: sideNames[c.patchSide.side],
          type: 'arc',
          mode: c.mode,
          radius: round(c.radius),
          angle: round(c.angle),
          center: fmtVec(c.center),
          planeNormal: fmtVec(c.planeNormal),
        });
      }
    }

    const def = {
      patch: patchIdx,
      degree: [3, 3],
      knotsU: knots,
      knotsV: knots,
      rational: patch.rational,
      controlPoints,
      weights,
    };
    if (constraints.length > 0) {
      def.constraints = constraints;
    }

    const json = compactNumberArrays(JSON.stringify(def, null, 2));

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:10px;top:50%;transform:translateY(-50%);background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:340px;max-height:70vh;font-family:monospace;font-size:11px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-family:sans-serif;font-size:13px;font-weight:bold;">Patch ${patchIdx} — NURBS Definition</span>
        <button id="props-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
      </div>
      <pre id="props-json" style="margin:0;overflow:auto;flex:1;background:#111;padding:8px;border-radius:4px;white-space:pre;user-select:all;cursor:text;line-height:1.4;">${escapeHtml(json)}</pre>
      <div style="display:flex;gap:6px;margin-top:8px;font-family:sans-serif;font-size:12px;align-items:center;">
        <label style="white-space:nowrap;">Distance</label>
        <input id="props-distance" type="number" value="10" step="1" style="width:70px;padding:3px;background:#333;color:#eee;border:1px solid #555;font-size:12px;" />
        <button id="props-push" style="flex:1;padding:5px;background:#345;color:#eee;border:none;border-radius:4px;cursor:pointer;">Push/Pull</button>
        <button id="props-extrude" style="flex:1;padding:5px;background:#354;color:#eee;border:none;border-radius:4px;cursor:pointer;">Extrude</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="props-copy" style="flex:1;padding:5px;background:#335;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Copy to Clipboard</button>
        <button id="props-subdivide" style="flex:1;padding:5px;background:#353;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Subdivide 3x3</button>
        <button id="props-remove" style="flex:1;padding:5px;background:#533;color:#eee;border:none;border-radius:4px;cursor:pointer;font-family:sans-serif;font-size:12px;">Remove</button>
      </div>
    `;

    document.body.appendChild(panel);
    this._propsDialog = panel;

    panel.querySelector('#props-close').onclick = () => this.closePropsDialog();
    panel.querySelector('#props-copy').onclick = () => {
      navigator.clipboard.writeText(json).then(() => {
        panel.querySelector('#props-copy').textContent = 'Copied!';
        setTimeout(() => {
          if (panel.querySelector('#props-copy')) {
            panel.querySelector('#props-copy').textContent = 'Copy to Clipboard';
          }
        }, 1500);
      });
    };
    panel.querySelector('#props-push').onclick = () => {
      const dist = parseFloat(panel.querySelector('#props-distance').value);
      if (isNaN(dist) || dist === 0) return;
      this.scene.pushPullPatch(patchIdx, dist);
      this.rebuildAll();
      this.persistCageState();
      this.showPropsDialog(patch);
    };
    panel.querySelector('#props-extrude').onclick = () => {
      const dist = parseFloat(panel.querySelector('#props-distance').value);
      if (isNaN(dist) || dist === 0) return;
      this.scene.extrudePatch(patchIdx, dist);
      this.rebuildAll();
      this.persistCageState();
      this.showPropsDialog(patch);
    };
    panel.querySelector('#props-subdivide').onclick = () => {
      this.scene.subdividePatch(patchIdx);
      this.selectPatch(null);
      this.rebuildAll();
      this.persistCageState();
    };
    panel.querySelector('#props-remove').onclick = () => {
      this.scene.removeSurface(patch);
      this.selectPatch(null);
      this.rebuildAll();
      this.persistCageState();
    };
  }

  closePropsDialog() {
    if (this._propsDialog) {
      document.body.removeChild(this._propsDialog);
      this._propsDialog = null;
    }
  }

  // ---- Mode Guide Dialog ----

  toggleG1Continuity() {
    this._g1Continuity = !this._g1Continuity;
    this.updateModeGuide();
  }

  showModeGuide(mode) {
    this.closeModeGuide();
    const isBridge = mode === 'bridge';

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1e1e1e;color:#d4d4d4;padding:10px 16px;border-radius:8px;font-family:sans-serif;font-size:12px;z-index:10001;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;align-items:center;gap:12px;';

    const title = document.createElement('span');
    title.style.cssText = 'font-weight:bold;font-size:13px;white-space:nowrap;';
    title.textContent = isBridge ? 'Bridge Surface' : 'Fill Hole';
    panel.appendChild(title);

    const sep1 = document.createElement('span');
    sep1.style.cssText = 'color:#555;';
    sep1.textContent = '|';
    panel.appendChild(sep1);

    // G1 toggle button
    const g1Btn = document.createElement('button');
    g1Btn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:sans-serif;white-space:nowrap;';
    this._updateG1BtnStyle = () => {
      g1Btn.style.background = this._g1Continuity ? '#4a7' : '#444';
      g1Btn.style.color = this._g1Continuity ? '#fff' : '#aaa';
      g1Btn.textContent = 'G1 ' + (this._g1Continuity ? 'ON' : 'OFF');
    };
    this._updateG1BtnStyle();
    g1Btn.onclick = () => this.toggleG1Continuity();
    panel.appendChild(g1Btn);

    if (isBridge) {
      const sep2 = document.createElement('span');
      sep2.style.cssText = 'color:#555;';
      sep2.textContent = '|';
      panel.appendChild(sep2);

      const flipBtn = document.createElement('button');
      flipBtn.style.cssText = 'padding:4px 10px;background:#446;color:#eee;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:sans-serif;white-space:nowrap;';
      flipBtn.textContent = 'Flip';
      flipBtn.onclick = () => bridgeFlip(this);
      panel.appendChild(flipBtn);
    }

    const sep3 = document.createElement('span');
    sep3.style.cssText = 'color:#555;';
    sep3.textContent = '|';
    panel.appendChild(sep3);

    const hint = document.createElement('span');
    hint.style.cssText = 'color:#888;font-size:11px;white-space:nowrap;';
    hint.textContent = isBridge ? 'Click two edges · Tab=flip · G=G1 · Esc=cancel' : 'Hover edge to preview · Click=fill · G=G1 · Esc=cancel';
    panel.appendChild(hint);

    document.body.appendChild(panel);
    this._modeGuide = panel;
  }

  updateModeGuide() {
    if (this._updateG1BtnStyle) this._updateG1BtnStyle();
  }

  closeModeGuide() {
    if (this._modeGuide) {
      if (this._modeGuide.parentNode) this._modeGuide.parentNode.removeChild(this._modeGuide);
      this._modeGuide = null;
      this._updateG1BtnStyle = null;
    }
  }

  // ---- Persist cage state to originating operation ----

  persistCageState() {
    this.scene.syncEntityGraph();
    // Save via the surfacing service's debounced autosave
    if (this.ctx.surfacingService && this.ctx.surfacingService.scheduleSave) {
      this.ctx.surfacingService.scheduleSave();
    }
    // Push a fresh snapshot so the React explorer tree re-renders
    if (this.ctx.surfacingService && this.ctx.surfacingService.notifyChange) {
      this.ctx.surfacingService.notifyChange();
    }
  }

  // ---- Utilities ----

  clearGroup(group) {
    while (group.children.length > 0) {
      const c = group.children[0];
      group.remove(c);
      c.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) ch.material.dispose(); });
    }
  }

  updateVisuals() {
    // Per-surface materials are managed via _tintSurface; nothing global to refresh.
  }

  dispose() {
    // Clean up the tool stack top-down.
    while (this._tools.length > 0) {
      this._tools.pop()!.cleanup();
    }

    const dom = this.ctx.viewer.sceneSetup.renderer.domElement;
    if (this._onMouseDown) dom.removeEventListener('mousedown', this._onMouseDown);
    if (this._onMouseUp) dom.removeEventListener('mouseup', this._onMouseUp);
    if (this._onMouseMove) dom.removeEventListener('mousemove', this._onMouseMove);
    if (this._onLoopToggle) document.removeEventListener('patch-insert-loop-toggle', this._onLoopToggle);
    if (this._onBridgeToggle) document.removeEventListener('patch-bridge-toggle', this._onBridgeToggle);
    if (this._onConstraintDeleted) document.removeEventListener('patch-cage-constraint-deleted', this._onConstraintDeleted);
    if (this._onFillHoleToggle) document.removeEventListener('patch-fill-hole-toggle', this._onFillHoleToggle);
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    document.body.style.cursor = '';
    if (this._selectionGizmo) {
      const s = this.ctx.viewer.sceneSetup.scene;
      s.remove(this._selectionGizmo.gizmo);
      s.remove(this._selectionGizmo.target);
      this._selectionGizmo.dispose();
      this._selectionGizmo = null;
    }
    this.closePropsDialog();
    this.closeArcDialog();
    this.closeEdgeDialog();
    this.closeModeGuide();
    if (this.scene) {
      for (const surface of [...this.scene.surfaces]) surface.dispose();
    }
    for (const d of this._disposers) {
      try { d(); } catch (e) { /* ignore */ }
    }
    this._disposers = [];
    if (this.overlaysGroup?.parent) {
      this.overlaysGroup.parent.remove(this.overlaysGroup);
    }
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function compactNumberArrays(json) {
  return json.replace(/\[\s*(-?\d[\d.e+\-]*\s*,?\s*)+\]/g, match => {
    const nums = match.slice(1, -1).split(',').map(s => s.trim());
    return '[' + nums.join(', ') + ']';
  });
}

