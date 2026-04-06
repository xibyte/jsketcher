import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {createSolidMaterial} from './viewUtils';
import {PATCH_CAGE} from '../../model/entities';
import {setAttribute} from 'scene/objectData';
import {ViewMode} from 'cad/scene/viewer';
import {
  BufferGeometry, BufferAttribute, Mesh, DoubleSide,
  WireframeGeometry, LineSegments, LineBasicMaterial,
  SphereGeometry, MeshBasicMaterial, Vector3, Object3D,
  Line
} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import {ConstantScaleGroup} from 'scene/scaleHelper';

const CP_COLOR = 0xffaa00;       // subcage control point (off-surface)
const CP_CORNER_COLOR = 0x00aaff; // corner control point (on-surface)
const CP_HOVER = 0xffdd44;
const CP_SELECTED = 0xff0000;
const CAGE_LINE_COLOR = 0xffaa00;
const HANDLE_SIZE = 4;

export class PatchCageView extends View {

  constructor(ctx, patchCage) {
    super(ctx, patchCage);
    this.rootGroup = SceneGraph.createGroup();
    this.ctx = ctx;

    // Surface
    this.geometry = buildGeom(patchCage.mesh);
    this.material = createSolidMaterial({side: DoubleSide});
    this.solidMesh = new Mesh(this.geometry, this.material);
    setAttribute(this.solidMesh, PATCH_CAGE, this);
    this.rootGroup.add(this.solidMesh);

    // Wireframe (non-pickable)
    this.wireframeGeometry = new WireframeGeometry(this.geometry);
    this.wireframeMaterial = new LineBasicMaterial({color: 0x2080ff, transparent: true, opacity: 0.3});
    this.wireframeMesh = new LineSegments(this.wireframeGeometry, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeMesh.raycast = () => {}; // disable raycast
    this.rootGroup.add(this.wireframeMesh);

    // Subcage group (visible when a patch is selected)
    this.subcageGroup = SceneGraph.createGroup();
    this.subcageGroup.visible = false;
    this.rootGroup.add(this.subcageGroup);
    this.subcageHandles = [];
    this.selectedPatchIdx = -1;
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
        this.pickPatch(e);
      }
    };
    dom.addEventListener('mousedown', this._onMouseDown);
    dom.addEventListener('mouseup', this._onMouseUp);

    // Keyboard: when a patch is selected, press U/V to split along that direction at t=0.5
    this._onKeyDown = (e) => {
      if (this.selectedPatchIdx < 0) return;
      if (e.key === 'u' || e.key === 'U') {
        this.model.cage.splitIsoline(this.selectedPatchIdx, 'u', 0.5);
        this.model.recompute();
        this.selectPatch(-1);
        this.rebuildAll();
      } else if (e.key === 'v' || e.key === 'V') {
        this.model.cage.splitIsoline(this.selectedPatchIdx, 'v', 0.5);
        this.model.recompute();
        this.selectPatch(-1);
        this.rebuildAll();
      } else if (e.key === 'a' || e.key === 'A') {
        // Arc constraint on selected edge
        this.promptArcConstraint();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    setAttribute(this.rootGroup, PATCH_CAGE, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      this.solidMesh.visible = mode !== ViewMode.WIREFRAME;
      this.wireframeMesh.visible = mode === ViewMode.MESH_WIREFRAME || mode === ViewMode.FACE_DEBUG;
    }));
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

    // Second: check if we hit the solid mesh for patch selection
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

  selectPatch(idx) {
    this.deselectHandle();
    this.selectedPatchIdx = idx;
    if (idx < 0) {
      this.subcageGroup.visible = false;
    } else {
      this.buildSubcage(idx);
      this.subcageGroup.visible = true;
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
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cv = ctrl[row][col]; // CageVertex instance
        const p = cv.position;
        const isCorner = (row === 0 || row === 3) && (col === 0 || col === 3);
        const baseColor = isCorner ? CP_CORNER_COLOR : CP_COLOR;

        const mat = new MeshBasicMaterial({color: baseColor, depthTest: false, transparent: true, opacity: 0.9});
        const sphere = new Mesh(geom, mat);
        sphere.renderOrder = 2;

        const handle = new ConstantScaleGroup(ss, HANDLE_SIZE * 2, 1, () => handle.position);
        handle.position.set(p[0], p[1], p[2]);
        handle.add(sphere);
        handle.userData = {patchIdx, row, col, isCorner, baseColor, cageVertex: cv};
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
    const lineMat = new LineBasicMaterial({color: CAGE_LINE_COLOR, depthTest: false, transparent: true, opacity: 0.6});
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
      // Directly mutate the CageVertex — all patches sharing it update automatically
      ud.cageVertex.set(pos.x, pos.y, pos.z);

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
    });

    ss.scene.add(this.gizmoTarget);
    ss.scene.add(this.gizmo);
  }

  selectSubcageHandle(handle) {
    this.deselectHandle();
    this.selectedHandle = handle;
    this.selectedEdgeSide = -1;
    handle.__mat.color.setHex(CP_SELECTED);
    this.gizmoTarget.position.copy(handle.position);
    this.gizmo.attach(this.gizmoTarget);
    this.gizmo.visible = true;
    this.gizmo.enabled = true;
    this.ctx.viewer.requestRender();

    // If the selected vertex is on an edge, remember which side
    const ud = handle.userData;
    if (ud.row === 0) this.selectedEdgeSide = 0;      // bottom
    else if (ud.col === 3) this.selectedEdgeSide = 1;  // right
    else if (ud.row === 3) this.selectedEdgeSide = 2;  // top
    else if (ud.col === 0) this.selectedEdgeSide = 3;  // left
  }

  promptArcConstraint() {
    if (this.selectedPatchIdx < 0) {
      alert('Select a patch first (click on surface)');
      return;
    }

    // Determine which edge to constrain
    let side = this.selectedEdgeSide;
    if (side < 0) {
      const sideStr = prompt('Which edge? (0=bottom, 1=right, 2=top, 3=left)', '0');
      if (sideStr === null) return;
      side = parseInt(sideStr);
      if (isNaN(side) || side < 0 || side > 3) return;
    }

    const radiusStr = prompt('Arc radius:', '50');
    if (radiusStr === null) return;
    const radius = parseFloat(radiusStr);
    if (isNaN(radius) || radius <= 0) return;

    const angleStr = prompt('Arc angle (degrees):', '90');
    if (angleStr === null) return;
    const angle = parseFloat(angleStr);
    if (isNaN(angle) || angle <= 0 || angle >= 360) return;

    const modeStr = prompt('Mode: 1=approximate (Bézier), 2=rational (exact NURBS)', '1');
    if (modeStr === null) return;
    const mode = modeStr === '2' ? 'rational' : 'approximate';

    // Compute plane normal from the edge and surface normal at midpoint
    const patch = this.model.cage.patches[this.selectedPatchIdx];
    const edgeVerts = patch.getEdgeVertices(side);
    const p0 = edgeVerts[0].position;
    const p3 = edgeVerts[3].position;

    // Use the surface normal at the edge midpoint as the arc plane normal
    let u = 0.5, v = 0.5;
    if (side === 0) v = 0;
    else if (side === 1) u = 1;
    else if (side === 2) v = 1;
    else if (side === 3) u = 0;
    const planeNormal = patch.normal(u, v);

    this.model.cage.constrainEdgeToArc(
      this.selectedPatchIdx, side,
      radius, angle, planeNormal, mode
    );
    this.model.recompute();
    this.rebuildAll();
    if (this.selectedPatchIdx >= 0) {
      this.buildSubcage(this.selectedPatchIdx);
    }
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

  // ---- Rebuild ----

  rebuildAll() {
    const g = buildGeom(this.model.mesh);
    this.solidMesh.geometry.dispose();
    this.solidMesh.geometry = g;
    this.geometry = g;

    const wg = new WireframeGeometry(g);
    this.wireframeMesh.geometry.dispose();
    this.wireframeMesh.geometry = wg;
    this.wireframeGeometry = wg;

    if (this.selectedPatchIdx >= 0) {
      this.buildSubcage(this.selectedPatchIdx);
    }

    this.ctx.viewer.requestRender();
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
    this.solidMesh.material.color.set(this.markColor || this.color || 0xbfbfbf);
  }

  dispose() {
    const dom = this.ctx.viewer.sceneSetup.renderer.domElement;
    if (this._onMouseDown) dom.removeEventListener('mousedown', this._onMouseDown);
    if (this._onMouseUp) dom.removeEventListener('mouseup', this._onMouseUp);
    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    if (this.gizmo) {
      this.gizmo.detach(); this.gizmo.dispose();
      const s = this.ctx.viewer.sceneSetup.scene;
      s.remove(this.gizmo); s.remove(this.gizmoTarget);
    }
    this.geometry.dispose(); this.material.dispose();
    this.wireframeMaterial.dispose(); this.wireframeGeometry.dispose();
    this.clearGroup(this.subcageGroup);
    super.dispose();
  }
}

function buildGeom(mesh) {
  if (!mesh) return new BufferGeometry();
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(mesh.vertices, 3));
  g.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  if (mesh.indices) g.setIndex(new BufferAttribute(mesh.indices, 1));
  return g;
}
