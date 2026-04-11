// @ts-nocheck
import * as SceneGraph from 'scene/sceneGraph';
import {SURFACING_SCENE} from 'cad/model/entities';
import {setAttribute} from 'scene/objectData';
import {Group} from 'three';
import ScalableLine from 'scene/objects/scalableLine';
import {distance as vdist, lerp as vlerp} from 'math/vec';
import {SelectionGizmoOverlay, selection$, select} from './three';
import {Vertex} from './models/Vertex/Vertex.entity';
import type {NurbsSurface} from './models/NurbsSurface/NurbsSurface.entity';
import type {BoundingCurve} from './models/BoundingCurve/BoundingCurve.entity';
import type {Scene} from './models/Scene/Scene.entity';
import type {SurfacingContext} from './SurfacingContext';
import {surfacingViewFlags$} from './surfacingViewFlags';

// bottom, right, top, left — used by showEdgeDialog for the edge colour swatch
const EDGE_COLORS = [0x2277ee, 0x22bb44, 0xdd3333, 0xddaa22];

/**
 * SurfacingEditor — interactive controller for one Scene.
 *
 * Owns everything that isn't pure data or pure view: selection state,
 * modal modes (loop-insert, bridge, fill-hole), dialogs, keyboard and
 * mouse listeners, the gizmo overlay, and the legacy scene-level view
 * mode overlays (wireframe, edges, boundaries). NOT a THREE.Group —
 * entities own their own 3D objects via `ctx.workingGroup`; the editor
 * keeps a child `overlaysGroup` there for its own decorations and
 * previews.
 *
 * Replaces the old SceneObject3D class and brings the "scene.object3d"
 * field to zero — the Scene entity is now pure children + ops.
 */
export class SurfacingEditor {

  readonly scene: Scene;
  readonly surfCtx: SurfacingContext;
  readonly ctx: any;                  // application ctx (viewer, services, …)
  marks: any[] = [];
  _disposers: (() => void)[] = [];

  /** `selection` is the primary state — direct reference, never an index. */
  selection: NurbsSurface | null = null;
  selectedEdgeCurve: BoundingCurve | null = null;

  // Many properties (gizmo overlay, modal-mode state, dialog refs, etc.)
  // are added dynamically — keep the index signature so TypeScript stays
  // out of the way.
  [key: string]: any;

  constructor(scene: Scene, ctx: any) {
    this.ctx = ctx;
    this.scene = scene;
    this.surfCtx = scene.ctx;

    // `overlaysGroup` hosts everything the editor draws directly into
    // the Three.js scene — wireframe / edges / boundaries / hover
    // outline / mode preview groups. It's a child of the shared
    // `ctx.workingGroup` so the editor's visual state disappears cleanly
    // on dispose.
    this.overlaysGroup = new Group();
    setAttribute(this.overlaysGroup, SURFACING_SCENE, this);
    this.surfCtx.workingGroup.add(this.overlaysGroup);
    this.surfaceMeshes = scene.surfaces.map(s => s.object3d);

    // Hover highlight group — per-hover black outline drawn over the
    // hovered surface. Still scene-level because it's transient and
    // depends on scene-level hover state (hover-in-set outline).
    this.hoverGroup = SceneGraph.createGroup();
    this.hoverGroup.visible = false;
    this.overlaysGroup.add(this.hoverGroup);
    this.hoveredPatch = null;

    // Apply the initial view-mode flags to every entity.
    this._applyViewFlags(surfacingViewFlags$.value);

    // Gizmo — a SelectionGizmoOverlay keyed off selection$.
    this._selectionGizmo = null;
    this._selectionUnsub = null;
    this.setupGizmo();

    // Hook the scene-level highlight service on the overlays group — it
    // receives the forwarded onMouseEnter / onMouseLeave from whichever
    // mesh the raycaster hits inside its subtree.
    this.overlaysGroup.onMouseEnter = () => ctx.highlightService.highlight(this.scene.id);
    this.overlaysGroup.onMouseLeave = () => ctx.highlightService.unHighlight(this.scene.id);

    // Single click pick: listen on DOM, raycast against solidMesh only
    this._clickStartX = 0;
    this._clickStartY = 0;
    const dom = ctx.viewer.sceneSetup.renderer.domElement;
    this._onMouseDown = (e) => { this._clickStartX = e.offsetX; this._clickStartY = e.offsetY; };
    this._onMouseUp = (e) => {
      const dx = Math.abs(e.offsetX - this._clickStartX);
      const dy = Math.abs(e.offsetY - this._clickStartY);
      if (dx < 3 && dy < 3 && e.button === 0) {
        if (this._loopInsertMode) {
          this.loopInsertExecute(e);
        } else if (this._bridgeMode) {
          this.bridgePickEdge(e);
        } else if (this._fillHoleMode) {
          this.fillHoleExecute();
        } else {
          this.pickPatch(e);
        }
      }
    };
    this._onMouseMove = (e) => {
      if (this._loopInsertMode) {
        this.loopInsertPreview(e);
        return;
      }
      if (this._fillHoleMode) {
        this.fillHolePreview(e);
        return;
      }
      // Surface hover is driven by per-mesh onMouseEnter/onMouseLeave now —
      // no manual raycast needed here.
    };
    dom.addEventListener('mousedown', this._onMouseDown);
    dom.addEventListener('mouseup', this._onMouseUp);
    dom.addEventListener('mousemove', this._onMouseMove);

    // Keyboard: when a patch is selected, press U/V to split along that direction at t=0.5
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this._loopInsertMode) {
        this.toggleLoopInsertMode();
        return;
      }
      if (this._bridgeMode) {
        if (e.key === 'Escape') { this.toggleBridgeMode(); return; }
        if (e.key === 'Tab') { e.preventDefault(); this.bridgeFlip(); return; }
        if (e.key === 'g' || e.key === 'G') { this.toggleG1Continuity(); return; }
        if (e.key === 'Enter' && this._bridgeEdge1 && this._bridgeEdge2) { this.bridgeExecute(); return; }
        return;
      }
      if (this._fillHoleMode) {
        if (e.key === 'Escape') { this.toggleFillHoleMode(); return; }
        if (e.key === 'g' || e.key === 'G') { this.toggleG1Continuity(); return; }
        return;
      }
      if (!this.selection) return;
      const patchIdx = this.scene.surfaces.indexOf(this.selection);
      if (e.key === 'u' || e.key === 'U') {
        this.scene.splitIsoline(patchIdx, 'u', 0.5);
        this.selectPatch(null);
        this.rebuildAll();
        this.persistCageState();
      } else if (e.key === 'v' || e.key === 'V') {
        this.scene.splitIsoline(patchIdx, 'v', 0.5);
        this.selectPatch(null);
        this.rebuildAll();
        this.persistCageState();
      } else if (e.key === 'a' || e.key === 'A') {
        this.showArcDialog();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    // Loop insert mode
    this._loopInsertMode = false;
    this._loopPreviewGroup = SceneGraph.createGroup();
    this._loopPreviewGroup.visible = false;
    this.overlaysGroup.add(this._loopPreviewGroup);

    this._onLoopToggle = () => this.toggleLoopInsertMode();
    document.addEventListener('patch-insert-loop-toggle', this._onLoopToggle);

    // Bridge surface mode
    this._bridgeMode = false;
    this._bridgeEdge1 = null; // {patchIdx, side}
    this._bridgeEdge2 = null;
    this._bridgeFlipped = false;
    this._bridgePreviewGroup = SceneGraph.createGroup();
    this._bridgePreviewGroup.visible = false;
    this.overlaysGroup.add(this._bridgePreviewGroup);

    this._onBridgeToggle = () => this.toggleBridgeMode();
    document.addEventListener('patch-bridge-toggle', this._onBridgeToggle);

    // Fill hole mode
    this._fillHoleMode = false;
    this._fillHolePreviewGroup = SceneGraph.createGroup();
    this._fillHolePreviewGroup.visible = false;
    this.overlaysGroup.add(this._fillHolePreviewGroup);
    this._fillHoleLoop = null;

    this._onFillHoleToggle = () => this.toggleFillHoleMode();
    document.addEventListener('patch-fill-hole-toggle', this._onFillHoleToggle);

    // G1 continuity toggle for bridge/fill modes
    this._g1Continuity = false;

    // Listen for constraint deletions from the explorer panel
    this._onConstraintDeleted = () => {
      ;
      this.rebuildAll();
      this.persistCageState();
      this.ctx.viewer.requestRender();
    };
    document.addEventListener('patch-cage-constraint-deleted', this._onConstraintDeleted);

    this._disposers.push(surfacingViewFlags$.attach(flags => {
      this._applyViewFlags(flags);
      ctx.viewer.requestRender();
    }));
  }

  /**
   * Fan out the 4 view-mode flags across every entity view:
   *   - faces       → surface.object3d.setFacesVisible
   *   - mesh        → surface.object3d.setWireframeVisible
   *   - edges       → every bounding curve shown at base style
   *   - boundaries  → only curves that are "set silhouettes" shown
   *
   * A curve is a set-silhouette when it has fewer than 2 users
   * (free edge) or its users span more than one SurfaceSet — that's
   * the same predicate the old scene-level rebuildBoundariesGroup used.
   */
  _applyViewFlags(flags: any) {
    const scene = this.scene;
    if (!scene) return;

    for (const surface of scene.surfaces) {
      const view: any = surface.object3d;
      if (!view) continue;
      if (typeof view.setFacesVisible === 'function') view.setFacesVisible(flags.faces);
      if (typeof view.setWireframeVisible === 'function') view.setWireframeVisible(flags.mesh);
    }

    for (const curve of scene.boundingCurves) {
      const view: any = curve.object3d;
      if (!view || typeof view.setGlobalVisibility !== 'function') continue;
      const show = flags.edges || (flags.boundaries && isSetBoundary(curve));
      view.setGlobalVisibility(show);
    }
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

  // ---- Patch picking ----

  pickPatch(e) {
    const ss = this.ctx.viewer.sceneSetup;
    const raycaster = ss.createRaycaster(e.offsetX, e.offsetY);

    // 1. CP handles — only meaningful while a surface is selected. Each
    //    Vertex owns its handle internally (created on setVisible(true))
    //    and tags its Three.js nodes with `userData.entity = vertex`.
    //    Raycast the shared workingGroup and walk up to recover the
    //    Vertex entity.
    if (this.selection) {
      const handleHits: any[] = [];
      const workingGroup = this.surfCtx.workingGroup;
      workingGroup.traverse((child: any) => {
        if (child.isMesh && child.visible) child.raycast(raycaster, handleHits);
      });
      // Filter: only hits on grid CPs of the currently selected patch.
      const allowed = new Set<Vertex>();
      for (const row of this.selection.grid) for (const cp of row) allowed.add(cp);
      let bestVertex: Vertex | null = null;
      let bestDist = Infinity;
      for (const h of handleHits) {
        let node: any = h.object;
        while (node && !(node.userData && node.userData.entity instanceof Vertex)) node = node.parent;
        if (!node) continue;
        const entity: Vertex = node.userData.entity;
        if (!allowed.has(entity)) continue;
        if (h.distance < bestDist) {
          bestDist = h.distance;
          bestVertex = entity;
        }
      }
      if (bestVertex && bestVertex.isSelectable()) {
        select(bestVertex);
        this.selectedEdgeCurve = null;
        this.closeEdgeDialog();
        this.ctx.viewer.requestRender();
        return;
      }
    }

    // 2. Highlighted BoundingCurve overlays on the selected surface.
    if (this.selection) {
      const patch = this.selection;
      const edgeHits: any[] = [];
      for (const cv of [
        patch.boundingCurves.bottom, patch.boundingCurves.right,
        patch.boundingCurves.top,    patch.boundingCurves.left,
      ]) {
        const view: any = cv?.object3d;
        if (!view || !view.visible) continue;
        view.traverse((child: any) => {
          if (child.isLine2 || child.isLine) child.raycast?.(raycaster, edgeHits);
        });
      }
      if (edgeHits.length > 0) {
        edgeHits.sort((a, b) => a.distance - b.distance);
        let node = edgeHits[0].object;
        while (node && !(node.userData?.curve)) node = node.parent;
        if (node) {
          this.selectEdge(node.userData.curve as BoundingCurve);
          return;
        }
      }
    }

    // 3. Per-surface mesh raycast for patch selection.
    const hit = this._raycastSurface(raycaster);
    this.selectPatch(hit);
  }

  /** Raycast against every NurbsSurface's inner mesh; returns the hit entity or null. */
  _raycastSurface(raycaster): NurbsSurface | null {
    let best: NurbsSurface | null = null;
    let bestDist = Infinity;
    const surfaces = this.scene.surfaces;
    for (let i = 0; i < surfaces.length; i++) {
      const view: any = surfaces[i].object3d;
      if (!view || !view.visible || !view.mesh) continue;
      const hits: any[] = [];
      view.mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.distance < bestDist) {
          bestDist = h.distance;
          best = surfaces[i];
        }
      }
    }
    return best;
  }

  setHover(patch: NurbsSurface | null) {
    if (patch === this.hoveredPatch) return;

    // Reset all surfaces — each surface mesh owns its own hover state now.
    this._clearAllSurfaceHover();

    this.hoveredPatch = patch;
    this.clearGroup(this.hoverGroup);

    if (!patch) {
      this.hoverGroup.visible = false;
      this.ctx.viewer.requestRender();
      return;
    }

    const ss = this.ctx.viewer.sceneSetup;
    const N = 24;

    // Tint the surfaces in the set via each view's setHover / setHoverInSet.
    const set = patch.surfaceSet;
    if (set) {
      for (const member of set.surfaces) {
        const m: any = member.object3d;
        if (!m) continue;
        if (member === patch) m.setHover(true);
        else m.setHoverInSet(true);
      }
    } else {
      const m: any = patch.object3d;
      if (m) m.setHover(true);
    }

    // Black boundary outline (only on the actually hovered surface)
    const edgeDefs = [
      () => [patch.grid[0][0], patch.grid[0][1], patch.grid[0][2], patch.grid[0][3]],
      () => [patch.grid[0][3], patch.grid[1][3], patch.grid[2][3], patch.grid[3][3]],
      () => [patch.grid[3][3], patch.grid[3][2], patch.grid[3][1], patch.grid[3][0]],
      () => [patch.grid[3][0], patch.grid[2][0], patch.grid[1][0], patch.grid[0][0]],
    ];
    const allPts = [];
    for (const getEdge of edgeDefs) {
      const cps = getEdge().map(v => v.position);
      for (let i = 0; i <= N; i++) {
        if (i === 0 && allPts.length > 0) continue;
        const t = i / N, mt = 1 - t;
        allPts.push([
          mt*mt*mt*cps[0][0]+3*mt*mt*t*cps[1][0]+3*mt*t*t*cps[2][0]+t*t*t*cps[3][0],
          mt*mt*mt*cps[0][1]+3*mt*mt*t*cps[1][1]+3*mt*t*t*cps[2][1]+t*t*t*cps[3][1],
          mt*mt*mt*cps[0][2]+3*mt*mt*t*cps[1][2]+3*mt*t*t*cps[2][2]+t*t*t*cps[3][2],
        ]);
      }
    }
    allPts.push(allPts[0]);

    const line = new ScalableLine(ss, allPts, 3, 0x000000);
    line.renderOrder = 3;
    line.raycast = () => {};
    this.hoverGroup.add(line);

    this.hoverGroup.visible = true;
    this.ctx.viewer.requestRender();
  }

  selectPatch(patch: NurbsSurface | null) {
    this.deselectHandle();
    this.deselectEdge();
    this.setHover(null);

    // Tear down the previous surface's selection visuals via its own view.
    if (this.selection && this.selection !== patch) {
      const prevView: any = this.selection.object3d;
      if (prevView && typeof prevView.setSelected === 'function') {
        prevView.setSelected(false);
      }
    }

    this.selection = patch;

    if (!patch) {
      this.closePropsDialog();
    } else {
      const view: any = patch.object3d;
      if (view && typeof view.setSelected === 'function') view.setSelected(true);
      this.showPropsDialog(patch);
    }
    this.ctx.viewer.requestRender();
  }

  /** Backward-compat getter for callers still thinking in indices. */
  get selectedPatchIdx(): number {
    return this.selection ? this.scene.surfaces.indexOf(this.selection) : -1;
  }

  // ---- Handle selection + gizmo ----

  setupGizmo() {
    const ss = this.ctx.viewer.sceneSetup;

    // One shared SelectionGizmoOverlay driven by selection$. When a
    // Vertex is published to selection$ (via its handle's onMouseClick
    // → select(this)), the overlay attaches its TransformControls to
    // it. On drag the gizmo calls scene.moveVertex, and the onChange
    // hook refreshes scene-level overlays that aren't on the
    // Vertex.usedBy invalidation chain.
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

    // Listen to selection$ so clicking a CP handle clears any live edge
    // selection (they're mutually exclusive).
    this._selectionUnsub = selection$.attach((sel) => {
      if (sel instanceof Vertex) {
        this.selectedEdgeCurve = null;
        this.closeEdgeDialog();
      }
      this.ctx.viewer.requestRender();
    });
  }

  /** Clear the current CP handle selection (if any) via selection$. */
  deselectHandle() {
    if (selection$.value instanceof Vertex) {
      select(null);
    }
  }

  // ---- Edge selection ----

  /**
   * Select a BoundingCurve. The curve is shared across the surfaces that
   * use it; the edge dialog applies to the currently-selected patch's side
   * of that curve, so we translate curve → side via the patch's own
   * `boundingCurves` lookup.
   */
  selectEdge(curve) {
    this.deselectEdge();
    this.deselectHandle();
    if (!this.selection) return;
    const patch = this.selection;
    const side = this._findSideOfCurve(patch, curve);
    if (side < 0) return;
    this.selectedEdgeCurve = curve;
    // Highlighting is already in place via NurbsSurfaceObject3D.setSelected;
    // re-emphasise the clicked edge via the curve view's own selection flag.
    if (curve.object3d && typeof curve.object3d.setSelected === 'function') {
      curve.object3d.setSelected(true);
    }
    this.showEdgeDialog(side);
    this.ctx.viewer.requestRender();
  }

  deselectEdge() {
    if (this.selectedEdgeCurve) {
      const view = this.selectedEdgeCurve.object3d;
      if (view && typeof view.setSelected === 'function') view.setSelected(false);
      this.selectedEdgeCurve = null;
    }
    this.closeEdgeDialog();
  }

  /** Return which side (0..3) of a patch a BoundingCurve is, or -1. */
  _findSideOfCurve(patch, curve) {
    if (patch.boundingCurves.bottom === curve) return 0;
    if (patch.boundingCurves.right === curve) return 1;
    if (patch.boundingCurves.top === curve) return 2;
    if (patch.boundingCurves.left === curve) return 3;
    return -1;
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
    const self = this;
    this.surfaceMeshes = scene.surfaces.map(s => s.object3d);
    const seenCurves = new Set<any>();
    for (const surface of scene.surfaces) {
      for (const row of surface.grid) {
        for (const cp of row) cp.setMirrorTarget(scene.isMirrorTarget(cp));
      }
      for (const cv of [
        surface.boundingCurves.bottom, surface.boundingCurves.right,
        surface.boundingCurves.top,    surface.boundingCurves.left,
      ]) {
        if (seenCurves.has(cv)) continue;
        seenCurves.add(cv);
        const view: any = cv.object3d;
        if (view && typeof view.setClickHandler === 'function') {
          view.setClickHandler((curve: any) => self.selectEdge(curve));
        }
      }
    }
  }

  /** Clear hover flags on every surface view. */
  _clearAllSurfaceHover() {
    for (const v of this.surfaceMeshes) {
      if (v && v.setHover) {
        v.setHover(false);
        if (v.setHoverInSet) v.setHoverInSet(false);
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

    // Per-surface wireframe and BoundingCurve views retessellate in
    // sync with their surface's own tessellate() call, so they don't
    // need a separate refresh step. Only the selected-patch cage
    // needs an explicit sync.
    if (this.selection) {
      const patch = this.selection;
      const cageView: any = patch.cage?.object3d;
      if (cageView && typeof cageView.sync === 'function') cageView.sync();
      for (const cv of [
        patch.boundingCurves.bottom, patch.boundingCurves.right,
        patch.boundingCurves.top,    patch.boundingCurves.left,
      ]) {
        const view: any = cv?.object3d;
        if (view && typeof view.rebuild === 'function') view.rebuild();
      }
    }

    this.ctx.viewer.requestRender();
  }

  // ---- Rebuild ----

  rebuildAll() {
    // Stash current selection so we can reapply it after the rebuild.
    const prev = this.selection;
    this.selection = null;

    this._refreshEntityRefs();
    this._applyViewFlags(surfacingViewFlags$.value);

    if (prev && this.scene.surfaces.includes(prev)) {
      this.selectPatch(prev);
      if (this._propsDialog) this.showPropsDialog(prev);
    }

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
      flipBtn.onclick = () => this.bridgeFlip();
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

  // ---- Fill Hole Mode ----

  toggleFillHoleMode() {
    this._fillHoleMode = !this._fillHoleMode;
    if (this._fillHoleMode) {
      if (this._loopInsertMode) this.toggleLoopInsertMode();
      if (this._bridgeMode) this.toggleBridgeMode();
      this.selectPatch(-1);
      this.setHover(-1);
      this._fillHoleLoop = null;
      this.clearGroup(this._fillHolePreviewGroup);
      this._fillHolePreviewGroup.visible = false;
      document.body.style.cursor = 'crosshair';
      this.showModeGuide('fill');
    } else {
      this._fillHoleLoop = null;
      this.clearGroup(this._fillHolePreviewGroup);
      this._fillHolePreviewGroup.visible = false;
      document.body.style.cursor = '';
      this.closeModeGuide();
      this.ctx.viewer.requestRender();
    }
  }

  fillHolePreview(e) {
    const hit = this.bridgeHitEdge(e);
    this.clearGroup(this._fillHolePreviewGroup);
    this._fillHoleLoop = null;

    if (!hit) {
      this._fillHolePreviewGroup.visible = false;
      this.ctx.viewer.requestRender();
      return;
    }

    // Check if this edge is a free edge
    const scene = this.scene;
    const adj = scene.findAdjacentPatches(hit.patchIdx);
    const isShared = adj.some(a => a.side === hit.side);
    if (isShared) {
      // Not a free edge — no hole here
      this._fillHolePreviewGroup.visible = false;
      this.ctx.viewer.requestRender();
      return;
    }

    // Trace hole boundary
    const loop = scene.traceHole(hit.patchIdx, hit.side);
    if (!loop || (loop.length !== 3 && loop.length !== 4)) {
      this._fillHolePreviewGroup.visible = false;
      this.ctx.viewer.requestRender();
      return;
    }

    this._fillHoleLoop = loop;
    const ss = this.ctx.viewer.sceneSetup;
    const N = 24;

    // Draw each edge of the hole in alternating colors
    const colors = [0x44ee44, 0xee8800, 0x4488ee, 0xee4444];
    for (let i = 0; i < loop.length; i++) {
      const edge = loop[i];
      const cps = edge.verts.map(v => v.position);
      const pts = [];
      for (let j = 0; j <= N; j++) {
        const t = j / N, mt = 1 - t;
        pts.push([
          mt*mt*mt*cps[0][0]+3*mt*mt*t*cps[1][0]+3*mt*t*t*cps[2][0]+t*t*t*cps[3][0],
          mt*mt*mt*cps[0][1]+3*mt*mt*t*cps[1][1]+3*mt*t*t*cps[2][1]+t*t*t*cps[3][1],
          mt*mt*mt*cps[0][2]+3*mt*mt*t*cps[1][2]+3*mt*t*t*cps[2][2]+t*t*t*cps[3][2],
        ]);
      }
      const line = new ScalableLine(ss, pts, 4, colors[i % colors.length]);
      line.renderOrder = 4;
      line.raycast = () => {};
      this._fillHolePreviewGroup.add(line);
    }

    this._fillHolePreviewGroup.visible = true;
    this.ctx.viewer.requestRender();
  }

  fillHoleExecute() {
    if (!this._fillHoleLoop) return;
    const scene = this.scene;

    if (scene.fillHole(this._fillHoleLoop)) {
      if (this._g1Continuity) {
        scene.applyG1AllSides(scene.surfaces.length - 1);
      }
      ;
      this.rebuildAll();
      this.persistCageState();
    }

    this._fillHoleLoop = null;
    this.clearGroup(this._fillHolePreviewGroup);
    this._fillHolePreviewGroup.visible = false;
    this.ctx.viewer.requestRender();
  }

  // ---- Bridge Surface Mode ----

  toggleBridgeMode() {
    this._bridgeMode = !this._bridgeMode;
    if (this._bridgeMode) {
      if (this._loopInsertMode) this.toggleLoopInsertMode();
      if (this._fillHoleMode) this.toggleFillHoleMode();
      this.selectPatch(-1);
      this.setHover(-1);
      this._bridgeEdge1 = null;
      this._bridgeEdge2 = null;
      this._bridgeFlipped = false;
      this.clearGroup(this._bridgePreviewGroup);
      this._bridgePreviewGroup.visible = false;
      document.body.style.cursor = 'crosshair';
      this.showModeGuide('bridge');
    } else {
      this._bridgeEdge1 = null;
      this._bridgeEdge2 = null;
      this.clearGroup(this._bridgePreviewGroup);
      this._bridgePreviewGroup.visible = false;
      document.body.style.cursor = '';
      this.closeModeGuide();
      this.ctx.viewer.requestRender();
    }
  }

  bridgeHitEdge(e) {
    // Raycast against the solid mesh, find closest patch, then determine closest boundary edge
    const ss = this.ctx.viewer.sceneSetup;
    const raycaster = ss.createRaycaster(e.offsetX, e.offsetY);
    // Per-surface raycast: find closest hit across all surface meshes
    let bestPi = -1;
    let bestDist = Infinity;
    let bestFaceIdx = -1;
    for (let i = 0; i < this.surfaceMeshes.length; i++) {
      const m: any = this.surfaceMeshes[i];
      if (!m || !m.visible || !m.mesh) continue;
      const hits: any[] = [];
      m.mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.distance < bestDist && h.faceIndex !== undefined) {
          bestDist = h.distance;
          bestPi = i;
          bestFaceIdx = h.faceIndex;
        }
      }
    }
    if (bestPi < 0) return null;

    // bestFaceIdx is the triangle index within this surface's mesh
    const res = this.scene.tessResolution;
    const quadIdx = Math.floor(bestFaceIdx / 2);
    const col = quadIdx % res;
    const row = Math.floor(quadIdx / res);
    const u = (col + 0.5) / res;
    const v = (row + 0.5) / res;
    const dists = [v, 1 - u, 1 - v, u]; // bottom, right, top, left
    let minSide = 0;
    for (let s = 1; s < 4; s++) {
      if (dists[s] < dists[minSide]) minSide = s;
    }
    return {patchIdx: bestPi, side: minSide};
  }

  bridgePickEdge(e) {
    const hit = this.bridgeHitEdge(e);
    if (!hit) return;

    if (!this._bridgeEdge1) {
      this._bridgeEdge1 = hit;
      this.bridgeUpdatePreview();
    } else if (!this._bridgeEdge2) {
      this._bridgeEdge2 = hit;
      // Auto-detect best orientation: pick the one that minimizes corner distance
      const scene = this.scene;
      const e1 = scene.surfaces[this._bridgeEdge1.patchIdx].getEdgeVertices(this._bridgeEdge1.side);
      const e2 = scene.surfaces[hit.patchIdx].getEdgeVertices(hit.side);
      const fwdDist = vdist(e1[0].position, e2[0].position) + vdist(e1[3].position, e2[3].position);
      const revDist = vdist(e1[0].position, e2[3].position) + vdist(e1[3].position, e2[0].position);
      this._bridgeFlipped = revDist < fwdDist;
      this.bridgeUpdatePreview();
    } else {
      // Third click = confirm (same as Enter)
      this.bridgeExecute();
    }
  }

  bridgeFlip() {
    if (!this._bridgeEdge1 || !this._bridgeEdge2) return;
    this._bridgeFlipped = !this._bridgeFlipped;
    this.bridgeUpdatePreview();
    this.ctx.viewer.requestRender();
  }

  bridgeUpdatePreview() {
    this.clearGroup(this._bridgePreviewGroup);
    const ss = this.ctx.viewer.sceneSetup;
    const scene = this.scene;
    const N = 24;

    // Draw edge 1 highlight
    if (this._bridgeEdge1) {
      const pts = this.tessellateEdge(this._bridgeEdge1.patchIdx, this._bridgeEdge1.side, N);
      const line = new ScalableLine(ss, pts, 4, 0x44ee44);
      line.renderOrder = 4;
      line.raycast = () => {};
      this._bridgePreviewGroup.add(line);
    }

    // Draw edge 2 highlight
    if (this._bridgeEdge2) {
      const pts = this.tessellateEdge(this._bridgeEdge2.patchIdx, this._bridgeEdge2.side, N);
      const line = new ScalableLine(ss, pts, 4, 0xee8800);
      line.renderOrder = 4;
      line.raycast = () => {};
      this._bridgePreviewGroup.add(line);

      // Preview bridge surface wireframe
      const e1Verts = scene.surfaces[this._bridgeEdge1.patchIdx].getEdgeVertices(this._bridgeEdge1.side);
      let e2Verts = scene.surfaces[this._bridgeEdge2.patchIdx].getEdgeVertices(this._bridgeEdge2.side);
      if (this._bridgeFlipped) e2Verts = [e2Verts[3], e2Verts[2], e2Verts[1], e2Verts[0]];

      // Draw connecting lines between corresponding endpoints
      for (let ci = 0; ci < 4; ci += 3) {
        const p1 = e1Verts[ci].position;
        const p2 = e2Verts[ci].position;
        const pts = [p1, p2];
        const line = new ScalableLine(ss, pts, 2, 0xaaaaaa);
        line.renderOrder = 4;
        line.raycast = () => {};
        this._bridgePreviewGroup.add(line);
      }
    }

    this._bridgePreviewGroup.visible = true;
    this.ctx.viewer.requestRender();
  }

  tessellateEdge(patchIdx, side, N) {
    const patch = this.scene.surfaces[patchIdx];
    const verts = patch.getEdgeVertices(side);
    const cps = verts.map(v => v.position);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      pts.push([
        mt*mt*mt*cps[0][0]+3*mt*mt*t*cps[1][0]+3*mt*t*t*cps[2][0]+t*t*t*cps[3][0],
        mt*mt*mt*cps[0][1]+3*mt*mt*t*cps[1][1]+3*mt*t*t*cps[2][1]+t*t*t*cps[3][1],
        mt*mt*mt*cps[0][2]+3*mt*mt*t*cps[1][2]+3*mt*t*t*cps[2][2]+t*t*t*cps[3][2],
      ]);
    }
    return pts;
  }

  bridgeExecute() {
    if (!this._bridgeEdge1 || !this._bridgeEdge2) return;
    const scene = this.scene;
    const {bridgeSurface} = require('../../ops/bridge/bridge.command');

    const e1 = scene.surfaces[this._bridgeEdge1.patchIdx].getEdgeVertices(this._bridgeEdge1.side);
    const e2 = scene.surfaces[this._bridgeEdge2.patchIdx].getEdgeVertices(this._bridgeEdge2.side);
    bridgeSurface(scene, e1, e2, {
      flipped: this._bridgeFlipped,
      g1: this._g1Continuity,
      sourcePatchIdx: this._bridgeEdge1.patchIdx,
    });

    this.rebuildAll();
    this.persistCageState();

    // Reset state, stay in bridge mode for more bridges
    this._bridgeEdge1 = null;
    this._bridgeEdge2 = null;
    this._bridgeFlipped = false;
    this.clearGroup(this._bridgePreviewGroup);
    this._bridgePreviewGroup.visible = false;
    this.ctx.viewer.requestRender();
  }

  // ---- Loop Insert Mode ----

  toggleLoopInsertMode() {
    this._loopInsertMode = !this._loopInsertMode;
    if (this._loopInsertMode) {
      this.selectPatch(-1);
      this.setHover(-1);
      document.body.style.cursor = 'crosshair';
    } else {
      this.clearGroup(this._loopPreviewGroup);
      this._loopPreviewGroup.visible = false;
      this._loopPending = null;
      document.body.style.cursor = '';
      this.ctx.viewer.requestRender();
    }
  }

  hitToUV(e) {
    const ss = this.ctx.viewer.sceneSetup;
    const raycaster = ss.createRaycaster(e.offsetX, e.offsetY);

    // Per-surface raycast: find closest hit
    let bestPi = -1;
    let bestDist = Infinity;
    let bestHit = null;
    for (let i = 0; i < this.surfaceMeshes.length; i++) {
      const m: any = this.surfaceMeshes[i];
      if (!m || !m.visible || !m.mesh) continue;
      const hits: any[] = [];
      m.mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.distance < bestDist && h.faceIndex !== undefined) {
          bestDist = h.distance;
          bestPi = i;
          bestHit = h;
        }
      }
    }
    if (bestPi < 0 || !bestHit) return null;

    const fi = bestHit.faceIndex;
    const res = this.scene.tessResolution;
    const meshGeo = (this.surfaceMeshes[bestPi] as any).mesh.geometry;
    const indices = meshGeo.index.array;
    const verts = meshGeo.attributes.position.array;

    const localTri = fi;
    const quadIdx = Math.floor(localTri / 2);
    const isSecond = localTri % 2 === 1;
    const col = quadIdx % res;
    const row = Math.floor(quadIdx / res);

    const hp = bestHit.point;
    const base = fi * 3;
    const i0 = indices[base], i1 = indices[base + 1], i2 = indices[base + 2];
    const p0 = [verts[i0*3], verts[i0*3+1], verts[i0*3+2]];
    const p1 = [verts[i1*3], verts[i1*3+1], verts[i1*3+2]];
    const p2 = [verts[i2*3], verts[i2*3+1], verts[i2*3+2]];

    const v0 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
    const v1 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
    const v2 = [hp.x-p0[0], hp.y-p0[1], hp.z-p0[2]];
    const d00 = v0[0]*v0[0]+v0[1]*v0[1]+v0[2]*v0[2];
    const d01 = v0[0]*v1[0]+v0[1]*v1[1]+v0[2]*v1[2];
    const d11 = v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2];
    const d20 = v2[0]*v0[0]+v2[1]*v0[1]+v2[2]*v0[2];
    const d21 = v2[0]*v1[0]+v2[1]*v1[1]+v2[2]*v1[2];
    const denom = d00*d11 - d01*d01;
    const bv = (d11*d20 - d01*d21) / denom;
    const bw = (d00*d21 - d01*d20) / denom;

    let localU, localV;
    if (!isSecond) {
      localU = bv + bw;
      localV = bw;
    } else {
      localU = bv;
      localV = bv + bw;
    }

    const u = (col + Math.max(0, Math.min(1, localU))) / res;
    const v = (row + Math.max(0, Math.min(1, localV))) / res;

    return {patchIdx: bestPi, u, v};
  }

  loopInsertPreview(e) {
    const hit = this.hitToUV(e);
    this.clearGroup(this._loopPreviewGroup);

    if (!hit) {
      this._loopPreviewGroup.visible = false;
      this._loopPending = null;
      this.ctx.viewer.requestRender();
      return;
    }

    // Auto-pick direction; Shift flips it
    let dir = Math.abs(hit.u - 0.5) < Math.abs(hit.v - 0.5) ? 'u' : 'v';
    if (e.shiftKey) dir = dir === 'u' ? 'v' : 'u';
    const t = Math.max(0.01, Math.min(0.99, dir === 'u' ? hit.u : hit.v));

    this._loopPending = {patchIdx: hit.patchIdx, dir, t};
    const scene = this.scene;
    const propagation = scene.computeIsolinePropagation(hit.patchIdx, dir, t);
    const ss = this.ctx.viewer.sceneSetup;

    for (const seg of propagation) {
      const pts = scene.tessellateIsoline(seg.idx, seg.dir, seg.t, 24);
      const line = new ScalableLine(ss, pts, 3, 0xffcc00);
      line.renderOrder = 4;
      line.raycast = () => {};
      this._loopPreviewGroup.add(line);
    }

    this._loopPreviewGroup.visible = true;
    this.ctx.viewer.requestRender();
  }

  loopInsertExecute() {
    if (!this._loopPending) return;
    const {patchIdx, dir, t} = this._loopPending;
    this.scene.splitIsoline(patchIdx, dir, t);
    ;
    this._loopPending = null;
    this.clearGroup(this._loopPreviewGroup);
    this._loopPreviewGroup.visible = false;
    this.rebuildAll();
    this.persistCageState();
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
    const dom = this.ctx.viewer.sceneSetup.renderer.domElement;
    if (this._onMouseDown) dom.removeEventListener('mousedown', this._onMouseDown);
    if (this._onMouseUp) dom.removeEventListener('mouseup', this._onMouseUp);
    if (this._onMouseMove) dom.removeEventListener('mousemove', this._onMouseMove);
    if (this._onLoopToggle) document.removeEventListener('patch-insert-loop-toggle', this._onLoopToggle);
    if (this._onBridgeToggle) document.removeEventListener('patch-bridge-toggle', this._onBridgeToggle);
    if (this._onConstraintDeleted) document.removeEventListener('patch-cage-constraint-deleted', this._onConstraintDeleted);
    if (this._onFillHoleToggle) document.removeEventListener('patch-fill-hole-toggle', this._onFillHoleToggle);
    if (this._loopInsertMode || this._bridgeMode || this._fillHoleMode) document.body.style.cursor = '';
    this.clearGroup(this.hoverGroup);
    this.clearGroup(this._loopPreviewGroup);
    this.clearGroup(this._bridgePreviewGroup);
    this.clearGroup(this._fillHolePreviewGroup);
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this._selectionGizmo) {
      const s = this.ctx.viewer.sceneSetup.scene;
      s.remove(this._selectionGizmo.gizmo);
      s.remove(this._selectionGizmo.target);
      this._selectionGizmo.dispose();
      this._selectionGizmo = null;
    }
    if (this._selectionUnsub) { this._selectionUnsub(); this._selectionUnsub = null; }
    this.closePropsDialog();
    this.closeArcDialog();
    this.closeEdgeDialog();
    this.closeModeGuide();
    // Cascade-dispose the entity graph. Each NurbsSurface.dispose()
    // tears down its own view + cage and decrements the refcount on
    // its shared curves and CPs; those self-dispose when their last
    // user leaves.
    if (this.scene) {
      for (const surface of [...this.scene.surfaces]) surface.dispose();
    }
    // Run any registered disposers
    for (const d of this._disposers) {
      try { d(); } catch (e) { /* ignore */ }
    }
    this._disposers = [];
    // Detach the overlays group from ctx.workingGroup.
    if (this.overlaysGroup && this.overlaysGroup.parent) {
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

/**
 * Is this BoundingCurve a "set silhouette" edge? True when the curve is
 * a free edge (≤ 1 user) or its users span more than one SurfaceSet.
 * Mirrors the predicate used by the old rebuildBoundariesGroup — only
 * silhouettes of logical faces get drawn in boundaries view mode.
 */
function isSetBoundary(curve: any): boolean {
  if (curve.users.size < 2) return true;
  let firstSet: any = undefined;
  for (const user of curve.users) {
    if (!user.surfaceSet) return true;
    if (firstSet === undefined) firstSet = user.surfaceSet;
    else if (firstSet !== user.surfaceSet) return true;
  }
  return false;
}
