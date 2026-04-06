import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {createSolidMaterial} from './viewUtils';
import {PATCH_CAGE} from '../../model/entities';
import {setAttribute} from 'scene/objectData';
import {ViewMode} from 'cad/scene/viewer';
import {
  BufferGeometry, BufferAttribute, Mesh, DoubleSide,
  WireframeGeometry, LineSegments, LineBasicMaterial,
  SphereGeometry, MeshBasicMaterial, Color, Vector3, Object3D,
  Line
} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import {ConstantScaleGroup} from 'scene/scaleHelper';

const HANDLE_COLOR = 0x00aaff;
const HANDLE_HOVER_COLOR = 0x66ccff;
const HANDLE_SELECTED_COLOR = 0xff4400;
const HANDLE_SIZE = 4;
const EDGE_COLOR = 0x00aaff;
const EDGE_HANDLE_COLOR = 0x44dd44;

export class PatchCageView extends View {

  constructor(ctx, patchCage) {
    super(ctx, patchCage);
    this.rootGroup = SceneGraph.createGroup();
    this.ctx = ctx;

    // Surface mesh
    this.geometry = buildPatchGeometry(patchCage.mesh);
    this.material = createSolidMaterial({side: DoubleSide});
    this.solidMesh = new Mesh(this.geometry, this.material);
    setAttribute(this.solidMesh, PATCH_CAGE, this);
    this.solidMesh.onMouseEnter = () => ctx.highlightService.highlight(this.model.id);
    this.solidMesh.onMouseLeave = () => ctx.highlightService.unHighlight(this.model.id);
    this.rootGroup.add(this.solidMesh);

    // Wireframe
    const wireGeom = new WireframeGeometry(this.geometry);
    this.wireframeMaterial = new LineBasicMaterial({color: 0x2080ff, transparent: true, opacity: 0.3});
    this.wireframeMesh = new LineSegments(wireGeom, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeGeometry = wireGeom;
    this.rootGroup.add(this.wireframeMesh);

    // Edge curves
    this.edgeGroup = SceneGraph.createGroup();
    this.rootGroup.add(this.edgeGroup);
    this.buildEdgeCurves();

    // Vertex handles
    this.handleGroup = SceneGraph.createGroup();
    this.rootGroup.add(this.handleGroup);
    this.handles = [];
    this.selectedHandle = null;
    this.buildHandles();

    // Transform gizmo
    this.gizmo = null;
    this.gizmoTarget = new Object3D();
    this.setupGizmo();

    setAttribute(this.rootGroup, PATCH_CAGE, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      const isWireframe = mode === ViewMode.WIREFRAME;
      const isMeshWire = mode === ViewMode.MESH_WIREFRAME;
      const isDebug = mode === ViewMode.FACE_DEBUG;
      this.solidMesh.visible = !isWireframe;
      this.wireframeMesh.visible = isMeshWire || isDebug;
    }));
  }

  setupGizmo() {
    const sceneSetup = this.ctx.viewer.sceneSetup;
    this.gizmo = new TransformControls(sceneSetup.camera, sceneSetup.renderer.domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.setMode('translate');
    this.gizmo.visible = false;
    this.gizmo.enabled = false;

    this.gizmo.addEventListener('dragging-changed', (event) => {
      sceneSetup.trackballControls.enabled = !event.value;
    });

    this.gizmo.addEventListener('change', () => {
      if (this.selectedHandle) {
        const vi = this.selectedHandle.userData.vertexIndex;
        const pos = this.gizmoTarget.position;
        this.model.cage.moveVertex(vi, [pos.x, pos.y, pos.z]);

        if (!this._recomputeTimer) {
          this._recomputeTimer = requestAnimationFrame(() => {
            this._recomputeTimer = null;
            this.model.recompute();
            this.rebuildAll();
          });
        }
      }
    });

    this.gizmo.addEventListener('mouseUp', () => {
      if (this.selectedHandle) {
        this.model.recompute();
        this.rebuildAll();
      }
    });

    sceneSetup.scene.add(this.gizmoTarget);
    sceneSetup.scene.add(this.gizmo);
  }

  selectHandle(handle) {
    if (this.selectedHandle) {
      this.selectedHandle.__mat.color.setHex(HANDLE_COLOR);
      this.selectedHandle.__mat.visible = false;
    }
    this.selectedHandle = handle;
    if (handle) {
      handle.__mat.color.setHex(HANDLE_SELECTED_COLOR);
      handle.__mat.visible = true;
      this.gizmoTarget.position.copy(handle.position);
      this.gizmo.attach(this.gizmoTarget);
      this.gizmo.visible = true;
      this.gizmo.enabled = true;
    } else {
      this.gizmo.detach();
      this.gizmo.visible = false;
      this.gizmo.enabled = false;
    }
    this.ctx.viewer.requestRender();
  }

  buildEdgeCurves() {
    while (this.edgeGroup.children.length > 0) {
      const c = this.edgeGroup.children[0];
      this.edgeGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }

    const cage = this.model.cage;
    const SAMPLES = 32;

    for (let ei = 0; ei < cage.edges.length; ei++) {
      const positions = [];
      for (let s = 0; s <= SAMPLES; s++) {
        const t = s / SAMPLES;
        const p = cage.evalEdge(ei, t);
        positions.push(p[0], p[1], p[2]);
      }
      const geom = new BufferGeometry();
      geom.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
      const mat = new LineBasicMaterial({color: EDGE_COLOR, depthTest: true});
      const line = new Line(geom, mat);
      this.edgeGroup.add(line);

      // Handle points (control points of the Bézier curve)
      const edge = cage.edges[ei];
      this.addSmallHandle(edge.h0, EDGE_HANDLE_COLOR);
      this.addSmallHandle(edge.h1, EDGE_HANDLE_COLOR);
    }
  }

  addSmallHandle(pos, color) {
    const geom = new SphereGeometry(1);
    const mat = new MeshBasicMaterial({color, depthTest: true, transparent: true, opacity: 0.6, visible: false});
    const sceneSetup = this.ctx.viewer.sceneSetup;
    const handle = new ConstantScaleGroup(sceneSetup, HANDLE_SIZE, 1, () => handle.position);
    handle.position.set(pos[0], pos[1], pos[2]);
    const sphere = new Mesh(geom, mat);
    sphere.onMouseEnter = () => { mat.visible = true; this.ctx.viewer.requestRender(); };
    sphere.onMouseLeave = () => { mat.visible = false; this.ctx.viewer.requestRender(); };
    handle.add(sphere);
    this.edgeGroup.add(handle);
  }

  buildHandles() {
    for (const h of this.handles) {
      this.handleGroup.remove(h);
      h.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    this.handles = [];

    const cage = this.model.cage;
    const handleGeom = new SphereGeometry(1);
    const sceneSetup = this.ctx.viewer.sceneSetup;

    for (let i = 0; i < cage.vertices.length; i++) {
      const v = cage.vertices[i];
      const mat = new MeshBasicMaterial({color: HANDLE_COLOR, depthTest: true, transparent: true, opacity: 0.8, visible: false});
      const sphere = new Mesh(handleGeom, mat);
      sphere.renderOrder = 1;

      const handle = new ConstantScaleGroup(sceneSetup, HANDLE_SIZE * 2, 1, () => handle.position);
      handle.position.set(v.position[0], v.position[1], v.position[2]);
      handle.add(sphere);
      handle.userData = {vertexIndex: i};
      handle.__mat = mat;

      sphere.onMouseEnter = () => {
        mat.visible = true;
        if (this.selectedHandle !== handle) mat.color.setHex(HANDLE_HOVER_COLOR);
        this.ctx.viewer.requestRender();
      };
      sphere.onMouseLeave = () => {
        if (this.selectedHandle !== handle) mat.visible = false;
        mat.color.setHex(HANDLE_COLOR);
        this.ctx.viewer.requestRender();
      };
      sphere.onMouseClick = () => this.selectHandle(handle);

      this.handleGroup.add(handle);
      this.handles.push(handle);
    }
  }

  rebuildAll() {
    const newGeom = buildPatchGeometry(this.model.mesh);
    this.solidMesh.geometry.dispose();
    this.solidMesh.geometry = newGeom;
    this.geometry = newGeom;

    const newWire = new WireframeGeometry(newGeom);
    this.wireframeMesh.geometry.dispose();
    this.wireframeMesh.geometry = newWire;
    this.wireframeGeometry = newWire;

    this.buildEdgeCurves();

    for (const h of this.handles) {
      const v = this.model.cage.vertices[h.userData.vertexIndex];
      h.position.set(v.position[0], v.position[1], v.position[2]);
    }

    this.ctx.viewer.requestRender();
  }

  updateVisuals() {
    this.solidMesh.material.color.set(this.markColor || this.color || 0xbfbfbf);
  }

  dispose() {
    if (this.gizmo) {
      this.gizmo.detach();
      this.gizmo.dispose();
      const scene = this.ctx.viewer.sceneSetup.scene;
      scene.remove(this.gizmo);
      scene.remove(this.gizmoTarget);
    }
    this.geometry.dispose();
    this.material.dispose();
    this.wireframeMaterial.dispose();
    this.wireframeGeometry.dispose();
    for (const h of this.handles) {
      h.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    while (this.edgeGroup.children.length > 0) {
      const c = this.edgeGroup.children[0];
      this.edgeGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    super.dispose();
  }
}

function buildPatchGeometry(shellMesh) {
  if (!shellMesh) return new BufferGeometry();
  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(shellMesh.vertices, 3));
  geom.setAttribute('normal', new BufferAttribute(shellMesh.normals, 3));
  if (shellMesh.indices) {
    geom.setIndex(new BufferAttribute(shellMesh.indices, 1));
  }
  return geom;
}
