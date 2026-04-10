// @ts-nocheck
import * as SceneGraph from 'scene/sceneGraph';
import {createSolidMaterial} from 'cad/scene/views/viewUtils';
import {SURFACING_SCENE} from 'cad/model/entities';
import {setAttribute} from 'scene/objectData';
import {ViewMode} from 'cad/scene/viewer';
import {
  Group, BufferGeometry, BufferAttribute, Mesh, DoubleSide,
  LineSegments, LineBasicMaterial,
  SphereGeometry, MeshBasicMaterial, Vector3, Object3D,
  Line
} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import {ConstantScaleGroup} from 'scene/scaleHelper';
import ScalableLine from 'scene/objects/scalableLine';
import {distance as vdist, lerp as vlerp} from 'math/vec';
import {CageVertex, NurbsPatch} from './Scene.entity';
import {surfacingViewFlags$} from '../../surfacingViewFlags';

export const SCENE_OBJECT3D_MARKER = 'SurfacingSceneObject3D';

const CP_COLOR = 0x222222;
const CP_HOVER = 0x555555;
const CP_SELECTED = 0xee3333;
const CP_MIRROR = 0x334466;
const CAGE_LINE_COLOR = 0x1a1a1a;
const EDGE_COLORS = [0x2277ee, 0x22bb44, 0xdd3333, 0xddaa22]; // bottom, right, top, left
const EDGE_SELECTED_COLOR = 0xffffff;
const HANDLE_SIZE = 3.5;

export class SceneObject3D extends Group {

  ctx: any;
  model: any;
  marks: any[] = [];
  _disposers: (() => void)[] = [];

  // Untyped instance state copied from the original patchCageView.js — many
  // properties are added dynamically. Keep loose typing for now.
  [key: string]: any;

  constructor(ctx, patchCage) {
    super();
    this.ctx = ctx;
    this.model = patchCage;
    if (patchCage && patchCage.ext) {
      patchCage.ext.view = this;
    }

    // Surface — silver metallic look
    this.geometry = buildGeom(patchCage.mesh);
    this.material = createSolidMaterial({
      side: DoubleSide,
      color: 0xd0d0d0,
      shininess: 80,
      specular: 0x444444,
    });
    this.solidMesh = new Mesh(this.geometry, this.material);
    setAttribute(this.solidMesh, SURFACING_SCENE, this);
    this.add(this.solidMesh);

    // Wireframe (non-pickable) — UV grid only, no triangle diagonals
    this.wireframeGeometry = buildGridWireframe(patchCage);
    this.wireframeMaterial = new LineBasicMaterial({color: 0x2080ff, transparent: true, opacity: 0.3});
    this.wireframeMesh = new LineSegments(this.wireframeGeometry, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeMesh.raycast = () => {}; // disable raycast
    this.add(this.wireframeMesh);

    // Bounding curves (edges) — shown when 'edges' flag is enabled
    this.edgesGeometry = buildBoundingCurvesGeometry(patchCage);
    this.edgesMaterial = new LineBasicMaterial({color: 0x000000, transparent: true, opacity: 0.85});
    this.edgesMesh = new LineSegments(this.edgesGeometry, this.edgesMaterial);
    this.edgesMesh.visible = false;
    this.edgesMesh.raycast = () => {};
    this.edgesMesh.renderOrder = 1;
    this.add(this.edgesMesh);

    // Hover highlight group
    this.hoverGroup = SceneGraph.createGroup();
    this.hoverGroup.visible = false;
    this.add(this.hoverGroup);
    this.hoveredPatchIdx = -1;

    // Subcage group (visible when a patch is selected)
    this.subcageGroup = SceneGraph.createGroup();
    this.subcageGroup.visible = false;
    this.add(this.subcageGroup);
    this.subcageHandles = [];
    this.edgeLines = [];
    this.selectedPatchIdx = -1;
    this.selectedEdgeIdx = -1;
    this.selectedHandle = null;

    // Gizmo
    this.gizmoTarget = new Object3D();
    this.gizmo = null;
    this.setupGizmo();

    this.solidMesh.onMouseEnter = () => ctx.highlightService.highlight(this.model.id);
    this.solidMesh.onMouseLeave = () => ctx.highlightService.unHighlight(this.model.id);

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
      if (this.selectedPatchIdx >= 0) return;
      const ss = ctx.viewer.sceneSetup;
      const raycaster = ss.createRaycaster(e.offsetX, e.offsetY);
      const hits = [];
      this.solidMesh.raycast(raycaster, hits);
      if (hits.length === 0) { this.setHover(-1); return; }
      hits.sort((a, b) => a.distance - b.distance);
      const fi = hits[0].faceIndex;
      if (fi === undefined) { this.setHover(-1); return; }
      const ranges = this.model.mesh.faceTriRanges;
      for (let pi = 0; pi < ranges.length; pi++) {
        if (fi >= ranges[pi][0] && fi < ranges[pi][1]) {
          this.setHover(pi);
          return;
        }
      }
      this.setHover(-1);
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
      if (this.selectedPatchIdx < 0) return;
      if (e.key === 'u' || e.key === 'U') {
        this.model.cage.splitIsoline(this.selectedPatchIdx, 'u', 0.5);
        this.model.recompute();
        this.selectPatch(-1);
        this.rebuildAll();
        this.persistCageState();
      } else if (e.key === 'v' || e.key === 'V') {
        this.model.cage.splitIsoline(this.selectedPatchIdx, 'v', 0.5);
        this.model.recompute();
        this.selectPatch(-1);
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
    this.add(this._loopPreviewGroup);

    this._onLoopToggle = () => this.toggleLoopInsertMode();
    document.addEventListener('patch-insert-loop-toggle', this._onLoopToggle);

    // Bridge surface mode
    this._bridgeMode = false;
    this._bridgeEdge1 = null; // {patchIdx, side}
    this._bridgeEdge2 = null;
    this._bridgeFlipped = false;
    this._bridgePreviewGroup = SceneGraph.createGroup();
    this._bridgePreviewGroup.visible = false;
    this.add(this._bridgePreviewGroup);

    this._onBridgeToggle = () => this.toggleBridgeMode();
    document.addEventListener('patch-bridge-toggle', this._onBridgeToggle);

    // Fill hole mode
    this._fillHoleMode = false;
    this._fillHolePreviewGroup = SceneGraph.createGroup();
    this._fillHolePreviewGroup.visible = false;
    this.add(this._fillHolePreviewGroup);
    this._fillHoleLoop = null;

    this._onFillHoleToggle = () => this.toggleFillHoleMode();
    document.addEventListener('patch-fill-hole-toggle', this._onFillHoleToggle);

    // G1 continuity toggle for bridge/fill modes
    this._g1Continuity = false;

    // Listen for constraint deletions from the explorer panel
    this._onConstraintDeleted = () => {
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
      this.ctx.viewer.requestRender();
    };
    document.addEventListener('patch-cage-constraint-deleted', this._onConstraintDeleted);

    setAttribute(this, SURFACING_SCENE, this);
    setAttribute(this, SCENE_OBJECT3D_MARKER, this);

    this._disposers.push(surfacingViewFlags$.attach(flags => {
      this.solidMesh.visible = flags.faces;
      this.wireframeMesh.visible = flags.mesh;
      this.edgesMesh.visible = flags.edges;
      ctx.viewer.requestRender();
    }));
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

    // First: check if we hit a subcage handle
    if (this.subcageGroup.visible && this.subcageHandles.length > 0) {
      const handleHits = [];
      for (const h of this.subcageHandles) {
        h.traverse(child => {
          if (child.isMesh) child.raycast(raycaster, handleHits);
        });
      }
      if (handleHits.length > 0) {
        handleHits.sort((a, b) => a.distance - b.distance);
        // Find which handle was hit
        const hitObj = handleHits[0].object;
        for (const h of this.subcageHandles) {
          let found = false;
          h.traverse(child => { if (child === hitObj) found = true; });
          if (found) {
            this.selectSubcageHandle(h);
            return;
          }
        }
      }
    }

    // Second: check if we hit a boundary edge line
    if (this.subcageGroup.visible && this.edgeLines.length > 0) {
      const edgeHits = [];
      for (const line of this.edgeLines) {
        const hits = [];
        line.raycast(raycaster, hits);
        for (const h of hits) {
          h._edgeIdx = line.userData.edgeIdx;
          edgeHits.push(h);
        }
      }
      if (edgeHits.length > 0) {
        edgeHits.sort((a, b) => a.distance - b.distance);
        this.selectEdge(edgeHits[0]._edgeIdx);
        return;
      }
    }

    // Third: check if we hit the solid mesh for patch selection
    const hits = [];
    this.solidMesh.raycast(raycaster, hits);

    if (hits.length === 0) {
      this.selectPatch(-1);
      return;
    }

    hits.sort((a, b) => a.distance - b.distance);
    const faceIndex = hits[0].faceIndex;
    if (faceIndex === undefined) {
      this.selectPatch(-1);
      return;
    }

    const ranges = this.model.mesh.faceTriRanges;
    for (let pi = 0; pi < ranges.length; pi++) {
      if (faceIndex >= ranges[pi][0] && faceIndex < ranges[pi][1]) {
        this.selectPatch(pi);
        return;
      }
    }
    this.selectPatch(-1);
  }

  setHover(patchIdx) {
    if (patchIdx === this.hoveredPatchIdx) return;
    this.hoveredPatchIdx = patchIdx;
    this.clearGroup(this.hoverGroup);

    if (patchIdx < 0) {
      this.hoverGroup.visible = false;
      this.ctx.viewer.requestRender();
      return;
    }

    const patch = this.model.cage.patches[patchIdx];
    const ss = this.ctx.viewer.sceneSetup;
    const res = this.model.tessResolution;
    const N = 24;

    // Highlight surface: tessellate just this patch, offset along normals
    const tess = this.model.cage.tessellatePatch(patchIdx, res);
    const offsetVerts = new Float32Array(tess.positions.length);
    for (let i = 0; i < tess.positions.length; i += 3) {
      offsetVerts[i]   = tess.positions[i]   + tess.normals[i]   * 0.3;
      offsetVerts[i+1] = tess.positions[i+1] + tess.normals[i+1] * 0.3;
      offsetVerts[i+2] = tess.positions[i+2] + tess.normals[i+2] * 0.3;
    }
    const hGeo = new BufferGeometry();
    hGeo.setAttribute('position', new BufferAttribute(offsetVerts, 3));
    hGeo.setAttribute('normal', new BufferAttribute(new Float32Array(tess.normals), 3));
    hGeo.setIndex(new BufferAttribute(new Uint32Array(tess.indices), 1));
    const hMat = new MeshBasicMaterial({color: 0x88bbee, transparent: true, opacity: 0.25, side: DoubleSide, depthTest: true});
    const hMesh = new Mesh(hGeo, hMat);
    hMesh.renderOrder = 0;
    hMesh.raycast = () => {};
    this.hoverGroup.add(hMesh);

    // Black boundary edges
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

  selectPatch(idx) {
    this.deselectHandle();
    this.deselectEdge();
    this.setHover(-1);
    this.selectedPatchIdx = idx;
    if (idx < 0) {
      this.subcageGroup.visible = false;
      this.closePropsDialog();
    } else {
      this.buildSubcage(idx);
      this.subcageGroup.visible = true;
      this.showPropsDialog(idx);
    }
    this.ctx.viewer.requestRender();
  }

  // ---- Subcage: 4×4 control point grid displayed as 3×3 quads ----

  buildSubcage(patchIdx) {
    this.clearGroup(this.subcageGroup);
    this.subcageHandles = [];

    const patch = this.model.cage.patches[patchIdx];
    const ctrl = patch.grid;
    const ss = this.ctx.viewer.sceneSetup;
    const geom = new SphereGeometry(1);

    // 16 control point handles
    const cage = this.model.cage;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cv = ctrl[row][col]; // CageVertex instance
        const p = cv.position;
        const isMirrorTarget = cage.isMirrorTarget(cv);
        const baseColor = isMirrorTarget ? CP_MIRROR : CP_COLOR;

        const mat = new MeshBasicMaterial({color: baseColor, depthTest: false, transparent: true, opacity: 0.95});
        const sphere = new Mesh(geom, mat);
        sphere.renderOrder = 2;

        const handle = new ConstantScaleGroup(ss, HANDLE_SIZE * 2, 1, () => handle.position);
        handle.position.set(p[0], p[1], p[2]);
        handle.add(sphere);
        handle.userData = {patchIdx, row, col, baseColor, cageVertex: cv};
        handle.__mat = mat;

        sphere.onMouseEnter = () => {
          if (this.selectedHandle !== handle) mat.color.setHex(CP_HOVER);
          this.ctx.viewer.requestRender();
        };
        sphere.onMouseLeave = () => {
          if (this.selectedHandle !== handle) mat.color.setHex(baseColor);
          this.ctx.viewer.requestRender();
        };
        sphere.onMouseClick = () => this.selectSubcageHandle(handle);

        this.subcageGroup.add(handle);
        this.subcageHandles.push(handle);
      }
    }

    // Grid lines: 3×3 quads = 4 horizontal lines + 4 vertical lines
    const lineMat = new LineBasicMaterial({color: CAGE_LINE_COLOR, depthTest: false, transparent: true, opacity: 0.85});
    lineMat.depthWrite = false;

    // Horizontal lines (along U, for each V row)
    for (let row = 0; row < 4; row++) {
      const pts = [];
      for (let col = 0; col < 4; col++) {
        const p = ctrl[row][col].position;
        pts.push(p[0], p[1], p[2]);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
      this.subcageGroup.add(new Line(g, lineMat));
    }

    // Vertical lines (along V, for each U column)
    for (let col = 0; col < 4; col++) {
      const pts = [];
      for (let row = 0; row < 4; row++) {
        const p = ctrl[row][col].position;
        pts.push(p[0], p[1], p[2]);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
      this.subcageGroup.add(new Line(g, lineMat));
    }

    // Boundary edges (screen-space constant width, 4 edges: bottom=0, right=1, top=2, left=3)
    this.edgeLines = [];
    const edgeVertSets = [
      [[0,0],[0,1],[0,2],[0,3]],  // bottom: row 0
      [[0,3],[1,3],[2,3],[3,3]],  // right: col 3
      [[3,0],[3,1],[3,2],[3,3]],  // top: row 3
      [[0,0],[1,0],[2,0],[3,0]],  // left: col 0
    ];
    for (let ei = 0; ei < 4; ei++) {
      const evs = edgeVertSets[ei];
      // Tessellate cubic Bézier edge into polyline
      const cps = evs.map(([r,c]) => ctrl[r][c].position);
      const pts = [];
      const N = 24;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const mt = 1 - t;
        pts.push([
          mt*mt*mt*cps[0][0] + 3*mt*mt*t*cps[1][0] + 3*mt*t*t*cps[2][0] + t*t*t*cps[3][0],
          mt*mt*mt*cps[0][1] + 3*mt*mt*t*cps[1][1] + 3*mt*t*t*cps[2][1] + t*t*t*cps[3][1],
          mt*mt*mt*cps[0][2] + 3*mt*mt*t*cps[1][2] + 3*mt*t*t*cps[2][2] + t*t*t*cps[3][2],
        ]);
      }
      const edgeColor = this.selectedEdgeIdx === ei ? EDGE_SELECTED_COLOR : EDGE_COLORS[ei];
      const line = new ScalableLine(ss, pts, 4, edgeColor);
      line.material.depthTest = false;
      line.material.transparent = true;
      line.material.opacity = 0.9;
      line.renderOrder = 1;
      line.userData = {edgeIdx: ei, baseColor: EDGE_COLORS[ei]};
      this.subcageGroup.add(line);
      this.edgeLines.push(line);
    }
  }

  // ---- Handle selection + gizmo ----

  setupGizmo() {
    const ss = this.ctx.viewer.sceneSetup;
    this.gizmo = new TransformControls(ss.camera, ss.renderer.domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.setMode('translate');
    this.gizmo.visible = false;
    this.gizmo.enabled = false;

    this.gizmo.addEventListener('dragging-changed', e => {
      ss.trackballControls.enabled = !e.value;
    });

    this.gizmo.addEventListener('change', () => {
      if (!this.selectedHandle) return;
      const ud = this.selectedHandle.userData;
      const pos = this.gizmoTarget.position;
      // Move via cage so constraints (arc, mirror) are enforced
      this.model.cage.moveVertex(ud.cageVertex, pos.x, pos.y, pos.z);

      if (!this._timer) {
        this._timer = requestAnimationFrame(() => {
          this._timer = null;
          this.model.recompute();
          this.rebuildAll();
        });
      }
    });

    this.gizmo.addEventListener('mouseUp', () => {
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
    });

    ss.scene.add(this.gizmoTarget);
    ss.scene.add(this.gizmo);
  }

  selectSubcageHandle(handle) {
    // Don't allow selecting mirror target CPs
    if (this.model.cage.isMirrorTarget(handle.userData.cageVertex)) return;
    this.deselectHandle();
    this.deselectEdge();
    this.selectedHandle = handle;
    handle.__mat.color.setHex(CP_SELECTED);
    this.gizmoTarget.position.copy(handle.position);
    this.gizmo.attach(this.gizmoTarget);
    this.gizmo.visible = true;
    this.gizmo.enabled = true;
    this.ctx.viewer.requestRender();
  }

  deselectHandle() {
    if (this.selectedHandle) {
      this.selectedHandle.__mat.color.setHex(this.selectedHandle.userData.baseColor);
      this.selectedHandle = null;
    }
    this.gizmo.detach();
    this.gizmo.visible = false;
    this.gizmo.enabled = false;
  }

  // ---- Edge selection ----

  selectEdge(edgeIdx) {
    this.deselectEdge();
    this.deselectHandle();
    this.selectedEdgeIdx = edgeIdx;
    if (this.edgeLines[edgeIdx]) {
      this.edgeLines[edgeIdx].material.color.setHex(EDGE_SELECTED_COLOR);
      this.edgeLines[edgeIdx].material.linewidth = 6;
    }
    this.showEdgeDialog(edgeIdx);
    this.ctx.viewer.requestRender();
  }

  deselectEdge() {
    if (this.selectedEdgeIdx >= 0 && this.edgeLines[this.selectedEdgeIdx]) {
      const line = this.edgeLines[this.selectedEdgeIdx];
      line.material.color.setHex(line.userData.baseColor);
      line.material.linewidth = 4;
    }
    this.selectedEdgeIdx = -1;
    this.closeEdgeDialog();
  }

  showEdgeDialog(edgeIdx) {
    this.closeEdgeDialog();
    const sideNames = ['Bottom', 'Right', 'Top', 'Left'];

    const patch = this.model.cage.patches[this.selectedPatchIdx];
    const verts = patch.getEdgeVertices(edgeIdx);
    const p0 = verts[0].position, p3 = verts[3].position;
    const chordLen = vdist(p0, p3);
    const round = (v) => Math.round(v * 1e4) / 1e4;

    // Check if this edge already has an arc constraint
    const cage = this.model.cage;
    const existing = cage.arcConstraints.find(c =>
      c.patchSide && c.patchSide.patchIdx === this.selectedPatchIdx && c.patchSide.side === edgeIdx
    );

    // Check if edge has adjacent patch (for continuity)
    const adj = cage.findAdjacentPatches(this.selectedPatchIdx);
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
      const ptch = this.model.cage.patches[patchIdx];
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

      cage.arcConstraints = cage.arcConstraints.filter(c => {
        if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
          if (c.mode === 'rational') ptch.rational = false;
          return false;
        }
        return true;
      });

      cage.constrainEdgeToArc(patchIdx, side, radius, 90, planeNormal, 'rational');
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
      this.showEdgeDialog(edgeIdx);
    };
    panel.querySelector('#edge-arc90-out').onclick = () => applyArc90(false);
    panel.querySelector('#edge-arc90-in').onclick = () => applyArc90(true);

    const removeBtn = panel.querySelector('#edge-remove-arc');
    if (removeBtn) {
      removeBtn.onclick = () => {
        cage.arcConstraints = cage.arcConstraints.filter(c => {
          if (c.patchSide && c.patchSide.patchIdx === this.selectedPatchIdx && c.patchSide.side === edgeIdx) {
            if (c.mode === 'rational') {
              this.model.cage.patches[c.patchSide.patchIdx].rational = false;
            }
            // Reset interior control points to linear interpolation
            const ev = this.model.cage.patches[this.selectedPatchIdx].getEdgeVertices(edgeIdx);
            const lp1 = vlerp(ev[0].position, ev[3].position, 1/3);
            const lp2 = vlerp(ev[0].position, ev[3].position, 2/3);
            ev[1].set(lp1[0], lp1[1], lp1[2]);
            ev[2].set(lp2[0], lp2[1], lp2[2]);
            return false;
          }
          return true;
        });
        // Reset weights on this edge
        this.model.cage.patches[this.selectedPatchIdx].weights.forEach(row => {
          for (let i = 0; i < row.length; i++) row[i] = 1;
        });
        this.model.cage.patches[this.selectedPatchIdx].rational = false;
        this.model.recompute();
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }

    const g1Btn = panel.querySelector('#edge-g1');
    if (g1Btn) {
      g1Btn.onclick = () => {
        cage.applyG1(this.selectedPatchIdx, edgeIdx);
        this.model.recompute();
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }
    const g2Btn = panel.querySelector('#edge-g2');
    if (g2Btn) {
      g2Btn.onclick = () => {
        cage.applyG2(this.selectedPatchIdx, edgeIdx);
        this.model.recompute();
        this.rebuildAll();
        this.persistCageState();
        this.showEdgeDialog(edgeIdx);
      };
    }

    const mirrorBtn = panel.querySelector('#edge-mirror');
    if (mirrorBtn) {
      mirrorBtn.onclick = () => {
        cage.mirrorAcrossEdge(this.selectedPatchIdx, edgeIdx);
        this.model.recompute();
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

  // ---- Rebuild ----

  rebuildAll() {
    const g = buildGeom(this.model.mesh);
    this.solidMesh.geometry.dispose();
    this.solidMesh.geometry = g;
    this.geometry = g;

    const wg = buildGridWireframe(this.model);
    this.wireframeMesh.geometry.dispose();
    this.wireframeMesh.geometry = wg;
    this.wireframeGeometry = wg;

    const eg = buildBoundingCurvesGeometry(this.model);
    this.edgesMesh.geometry.dispose();
    this.edgesMesh.geometry = eg;
    this.edgesGeometry = eg;

    if (this.selectedPatchIdx >= 0) {
      this.buildSubcage(this.selectedPatchIdx);
      if (this._propsDialog) this.showPropsDialog(this.selectedPatchIdx);
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
      const cage = this.model.cage;
      if (cage.arcConstraints.length > 0) {
        cage.removeArcConstraint(cage.arcConstraints[cage.arcConstraints.length - 1]);
      }
      this.model.recompute();
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

    const cage = this.model.cage;
    const patch = cage.patches[patchIdx];
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
    cage.arcConstraints = cage.arcConstraints.filter(c => {
      if (c.patchSide && c.patchSide.patchIdx === patchIdx && c.patchSide.side === side) {
        if (c.mode === 'rational') {
          this.model.cage.patches[c.patchSide.patchIdx].rational = false;
        }
        return false;
      }
      return true;
    });

    cage.constrainEdgeToArc(patchIdx, side, radius, angle, planeNormal, mode);
    this.model.recompute();
    this.rebuildAll();
    if (this.selectedPatchIdx >= 0) {
      this.buildSubcage(this.selectedPatchIdx);
    }
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

  showPropsDialog(patchIdx) {
    this.closePropsDialog();

    const patch = this.model.cage.patches[patchIdx];
    const cage = this.model.cage;

    const round = (v) => Math.round(v * 1e6) / 1e6;
    const fmtVec = (p) => [round(p[0]), round(p[1]), round(p[2])];

    // Control points as 4x4 array of [x,y,z]
    const controlPoints = patch.grid.map(row => row.map(v => fmtVec(v.position)));

    // Weights
    const weights = patch.weights.map(row => row.map(w => round(w)));

    // Knots (uniform clamped cubic: [0,0,0,0,1,1,1,1])
    const knots = [0, 0, 0, 0, 1, 1, 1, 1];

    // Edge constraints on this patch
    const sideNames = ['bottom', 'right', 'top', 'left'];
    const constraints = [];
    for (const c of cage.arcConstraints) {
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
      this.model.cage.pushPullPatch(patchIdx, dist);
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
      this.showPropsDialog(patchIdx);
    };
    panel.querySelector('#props-extrude').onclick = () => {
      const dist = parseFloat(panel.querySelector('#props-distance').value);
      if (isNaN(dist) || dist === 0) return;
      this.model.cage.extrudePatch(patchIdx, dist);
      this.model.recompute();
      this.rebuildAll();
      this.persistCageState();
      this.showPropsDialog(patchIdx);
    };
    panel.querySelector('#props-subdivide').onclick = () => {
      this.model.cage.subdividePatch(patchIdx);
      this.model.recompute();
      this.selectPatch(-1);
      this.rebuildAll();
      this.persistCageState();
    };
    panel.querySelector('#props-remove').onclick = () => {
      this.model.cage.patches.splice(patchIdx, 1);
      this.model.recompute();
      this.selectPatch(-1);
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
    const cage = this.model.cage;
    const adj = cage.findAdjacentPatches(hit.patchIdx);
    const isShared = adj.some(a => a.side === hit.side);
    if (isShared) {
      // Not a free edge — no hole here
      this._fillHolePreviewGroup.visible = false;
      this.ctx.viewer.requestRender();
      return;
    }

    // Trace hole boundary
    const loop = cage.traceHole(hit.patchIdx, hit.side);
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
    const cage = this.model.cage;

    if (cage.fillHole(this._fillHoleLoop)) {
      if (this._g1Continuity) {
        cage.applyG1AllSides(cage.patches.length - 1);
      }
      this.model.recompute();
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
    const hits = [];
    this.solidMesh.raycast(raycaster, hits);
    if (hits.length === 0) return null;
    hits.sort((a, b) => a.distance - b.distance);
    const fi = hits[0].faceIndex;
    const hp = hits[0].point;
    if (fi === undefined) return null;

    const ranges = this.model.mesh.faceTriRanges;
    const res = this.model.tessResolution;
    for (let pi = 0; pi < ranges.length; pi++) {
      if (fi >= ranges[pi][0] && fi < ranges[pi][1]) {
        // Determine UV within patch
        const localTri = fi - ranges[pi][0];
        const quadIdx = Math.floor(localTri / 2);
        const col = quadIdx % res;
        const row = Math.floor(quadIdx / res);
        const u = (col + 0.5) / res;
        const v = (row + 0.5) / res;
        // Closest boundary edge: min distance to sides
        const dists = [v, 1 - u, 1 - v, u]; // bottom, right, top, left
        let minSide = 0;
        for (let s = 1; s < 4; s++) {
          if (dists[s] < dists[minSide]) minSide = s;
        }
        return {patchIdx: pi, side: minSide};
      }
    }
    return null;
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
      const cage = this.model.cage;
      const e1 = cage.patches[this._bridgeEdge1.patchIdx].getEdgeVertices(this._bridgeEdge1.side);
      const e2 = cage.patches[hit.patchIdx].getEdgeVertices(hit.side);
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
    const cage = this.model.cage;
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
      const e1Verts = cage.patches[this._bridgeEdge1.patchIdx].getEdgeVertices(this._bridgeEdge1.side);
      let e2Verts = cage.patches[this._bridgeEdge2.patchIdx].getEdgeVertices(this._bridgeEdge2.side);
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
    const patch = this.model.cage.patches[patchIdx];
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
    const cage = this.model.cage;

    const e1 = cage.patches[this._bridgeEdge1.patchIdx].getEdgeVertices(this._bridgeEdge1.side);
    let e2 = cage.patches[this._bridgeEdge2.patchIdx].getEdgeVertices(this._bridgeEdge2.side);
    if (this._bridgeFlipped) e2 = [e2[3], e2[2], e2[1], e2[0]];

    // Build 4×4 grid: row 0 = edge1, row 3 = edge2, rows 1-2 interpolated
    const grid = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let c = 0; c < 4; c++) {
        if (r === 0) {
          row.push(e1[c]); // shared by identity with source patch
        } else if (r === 3) {
          row.push(e2[c]); // shared by identity with target patch
        } else {
          const t = r / 3;
          const p = vlerp(e1[c].position, e2[c].position, t);
          row.push(new CageVertex(p[0], p[1], p[2]));
        }
      }
      grid.push(row);
    }

    cage.patches.push(new NurbsPatch(grid));
    if (this._g1Continuity) {
      cage.applyG1AllSides(cage.patches.length - 1);
    }
    this.model.recompute();
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
    const hits = [];
    this.solidMesh.raycast(raycaster, hits);
    if (hits.length === 0) return null;
    hits.sort((a, b) => a.distance - b.distance);
    const hit = hits[0];
    const fi = hit.faceIndex;
    if (fi === undefined) return null;

    const ranges = this.model.mesh.faceTriRanges;
    const res = this.model.tessResolution;
    const indices = this.model.mesh.indices;
    const verts = this.model.mesh.vertices;

    for (let pi = 0; pi < ranges.length; pi++) {
      if (fi >= ranges[pi][0] && fi < ranges[pi][1]) {
        const localTri = fi - ranges[pi][0];
        const quadIdx = Math.floor(localTri / 2);
        const isSecond = localTri % 2 === 1;
        const col = quadIdx % res;
        const row = Math.floor(quadIdx / res);

        // The quad at (col, row) spans u=[col/res, (col+1)/res], v=[row/res, (row+1)/res]
        // Triangle 0: vertices (a, b, d) where a=(row,col), b=(row,col+1), d=(row+1,col+1)
        // Triangle 1: vertices (a, d, c) where a=(row,col), d=(row+1,col+1), c=(row+1,col)
        // Use hit point to interpolate within the quad
        const hp = hit.point;
        // Get quad corner world positions from the tessellation grid
        const patchVertOff = ranges[pi][0] * 3; // not quite right — need vertex offset
        // Simpler: use the triangle vertex positions from the index buffer
        const base = fi * 3;
        const i0 = indices[base], i1 = indices[base + 1], i2 = indices[base + 2];
        const p0 = [verts[i0*3], verts[i0*3+1], verts[i0*3+2]];
        const p1 = [verts[i1*3], verts[i1*3+1], verts[i1*3+2]];
        const p2 = [verts[i2*3], verts[i2*3+1], verts[i2*3+2]];

        // Compute barycentric coordinates of hit point in triangle
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
        const bu = 1 - bv - bw;

        // Map barycentric to (localU, localV) within the quad [0..1]×[0..1]
        // Tri 0 (a,b,d): a=(0,0), b=(1,0), d=(1,1) → localU = bv + bw, localV = bw
        // Tri 1 (a,d,c): a=(0,0), d=(1,1), c=(0,1) → localU = bv, localV = bv + bw
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

        return {patchIdx: pi, u, v};
      }
    }
    return null;
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
    const cage = this.model.cage;
    const propagation = cage.computeIsolinePropagation(hit.patchIdx, dir, t);
    const ss = this.ctx.viewer.sceneSetup;

    for (const seg of propagation) {
      const pts = cage.tessellateIsoline(seg.idx, seg.dir, seg.t, 24);
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
    this.model.cage.splitIsoline(patchIdx, dir, t);
    this.model.recompute();
    this._loopPending = null;
    this.clearGroup(this._loopPreviewGroup);
    this._loopPreviewGroup.visible = false;
    this.rebuildAll();
    this.persistCageState();
  }

  // ---- Persist cage state to originating operation ----

  persistCageState() {
    // Refresh scene entity if available
    if (this.model.refreshSceneEntity) {
      this.model.refreshSceneEntity();
    }
    // Save directly via project service (bypasses craft pipeline)
    this.ctx.projectService.scheduleSave();
    // Notify the constraints panel in the object tree
    document.dispatchEvent(new CustomEvent('patch-cage-constraints-changed'));
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
    this.solidMesh.material.color.set(this.color || 0xd0d0d0);
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
    if (this.gizmo) {
      this.gizmo.detach(); this.gizmo.dispose();
      const s = this.ctx.viewer.sceneSetup.scene;
      s.remove(this.gizmo); s.remove(this.gizmoTarget);
    }
    this.closePropsDialog();
    this.closeArcDialog();
    this.closeEdgeDialog();
    this.closeModeGuide();
    this.geometry.dispose(); this.material.dispose();
    this.wireframeMaterial.dispose(); this.wireframeGeometry.dispose();
    if (this.edgesMaterial) this.edgesMaterial.dispose();
    if (this.edgesGeometry) this.edgesGeometry.dispose();
    this.clearGroup(this.subcageGroup);
    // Run any registered disposers
    for (const d of this._disposers) {
      try { d(); } catch (e) { /* ignore */ }
    }
    this._disposers = [];
    if (this.model && this.model.ext) {
      this.model.ext.view = null;
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

function buildGeom(mesh) {
  if (!mesh) return new BufferGeometry();
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(mesh.vertices, 3));
  g.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  if (mesh.indices) g.setIndex(new BufferAttribute(mesh.indices, 1));
  return g;
}

/**
 * Build a wireframe geometry showing the UV tessellation grid (rectangles only,
 * no triangle diagonals). For each surface, evaluates the (n+1)×(n+1) grid of
 * surface points and emits horizontal + vertical line segments.
 */
function buildGridWireframe(model: any): BufferGeometry {
  const geo = new BufferGeometry();
  if (!model || !model.scene) return geo;
  const scene = model.scene;
  const resolution = model.tessResolution || 8;
  const positions: number[] = [];

  for (const surface of scene.surfaces) {
    const n = resolution;
    // Sample (n+1)×(n+1) grid of surface points
    const grid: number[][][] = [];
    for (let j = 0; j <= n; j++) {
      const row: number[][] = [];
      for (let i = 0; i <= n; i++) {
        const p = surface.eval(i / n, j / n);
        row.push([p[0], p[1], p[2]]);
      }
      grid.push(row);
    }
    // Horizontal segments (along U): for each row, n segments
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i < n; i++) {
        const a = grid[j][i], b = grid[j][i + 1];
        positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      }
    }
    // Vertical segments (along V): for each column, n segments
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j < n; j++) {
        const a = grid[j][i], b = grid[j + 1][i];
        positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      }
    }
  }

  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return geo;
}

/**
 * Build line-segment geometry for all bounding curves of all surfaces.
 * Each cubic Bézier boundary is tessellated into N segments.
 */
function buildBoundingCurvesGeometry(model: any): BufferGeometry {
  const geo = new BufferGeometry();
  if (!model || !model.scene) return geo;
  const scene = model.scene;
  const positions: number[] = [];
  const N = 24;

  for (const surface of scene.surfaces) {
    for (const side of [0, 1, 2, 3]) {
      const bc = surface.getBoundingCurve(side);
      let prev: number[] | null = null;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const p = bc.eval(t);
        if (prev) {
          positions.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
        }
        prev = [p[0], p[1], p[2]];
      }
    }
  }

  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return geo;
}
