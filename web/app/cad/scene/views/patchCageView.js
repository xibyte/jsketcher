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

    // Click surface to pick patch
    this.solidMesh.onMouseDown = () => {};
    this.solidMesh.onMouseClick = (e) => {
      console.log('PatchCageView: solidMesh clicked');
      this.pickPatch(e);
    };
    this.solidMesh.onMouseEnter = () => ctx.highlightService.highlight(this.model.id);
    this.solidMesh.onMouseLeave = () => ctx.highlightService.unHighlight(this.model.id);
    this.solidMesh.passMouseEvent = () => true;

    setAttribute(this.rootGroup, PATCH_CAGE, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      this.solidMesh.visible = mode !== ViewMode.WIREFRAME;
      this.wireframeMesh.visible = mode === ViewMode.MESH_WIREFRAME || mode === ViewMode.FACE_DEBUG;
    }));
  }

  // ---- Patch picking ----

  pickPatch(event) {
    const me = event.mouseEvent;
    if (!me) return;

    // Raycast directly against the solid mesh only
    const ss = this.ctx.viewer.sceneSetup;
    const raycaster = ss.createRaycaster(me.offsetX, me.offsetY);
    const hits = [];
    this.solidMesh.raycast(raycaster, hits);

    if (hits.length === 0) {
      this.selectPatch(-1);
      return;
    }

    // Sort by distance — take the closest hit (front face)
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
    const ctrl = patch.control;
    const ss = this.ctx.viewer.sceneSetup;
    const geom = new SphereGeometry(1);

    // 16 control point handles
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cv = ctrl[row][col]; // CageVertex instance
        const p = cv.position;
        const isCorner = (row === 0 || row === 3) && (col === 0 || col === 3);
        const baseColor = isCorner ? CP_CORNER_COLOR : CP_COLOR;

        const mat = new MeshBasicMaterial({color: baseColor, depthTest: true, transparent: true, opacity: 0.9});
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
    const lineMat = new LineBasicMaterial({color: CAGE_LINE_COLOR, depthTest: true, transparent: true, opacity: 0.6});

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
