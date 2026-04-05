import {View} from './view';
import * as SceneGraph from 'scene/sceneGraph';
import {createSolidMaterial} from './viewUtils';
import {SUBD} from '../../model/entities';
import {setAttribute} from 'scene/objectData';
import {ViewMode} from 'cad/scene/viewer';
import {
  BufferGeometry, BufferAttribute, Mesh, DoubleSide,
  WireframeGeometry, LineSegments, LineBasicMaterial,
  SphereGeometry, MeshBasicMaterial, Color, Vector3, Object3D
} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import {ConstantScaleGroup} from 'scene/scaleHelper';

const HANDLE_COLOR = 0xff8800;
const HANDLE_HOVER_COLOR = 0xffcc00;
const HANDLE_SELECTED_COLOR = 0xff0000;
const HANDLE_SIZE = 3;
const EDGE_COLOR = 0xff8800;
const CREASE_EDGE_COLOR = 0xff0000;

export class SubDView extends View {

  constructor(ctx, subd) {
    super(ctx, subd);
    this.rootGroup = SceneGraph.createGroup();
    this.ctx = ctx;

    // Smooth subdivided surface
    this.geometry = buildSubDGeometry(subd.mesh);
    this.material = createSolidMaterial({side: DoubleSide});
    this.solidMesh = new Mesh(this.geometry, this.material);
    setAttribute(this.solidMesh, SUBD, this);
    this.solidMesh.onMouseEnter = () => ctx.highlightService.highlight(this.model.id);
    this.solidMesh.onMouseLeave = () => ctx.highlightService.unHighlight(this.model.id);
    this.rootGroup.add(this.solidMesh);

    // Subdivided wireframe
    const wireGeom = new WireframeGeometry(this.geometry);
    this.wireframeMaterial = new LineBasicMaterial({color: 0x2080ff, transparent: true, opacity: 0.3});
    this.wireframeMesh = new LineSegments(wireGeom, this.wireframeMaterial);
    this.wireframeMesh.visible = false;
    this.wireframeGeometry = wireGeom;
    this.rootGroup.add(this.wireframeMesh);

    // Control cage edges
    this.cageGroup = SceneGraph.createGroup();
    this.rootGroup.add(this.cageGroup);
    this.buildCageEdges(subd.controlMesh);

    // Control point handles
    this.handleGroup = SceneGraph.createGroup();
    this.rootGroup.add(this.handleGroup);
    this.handles = [];
    this.selectedHandle = null;
    this.buildHandles(subd.controlMesh);

    // Transform gizmo
    this.gizmo = null;
    this.gizmoTarget = new Object3D();
    this.setupGizmo();

    setAttribute(this.rootGroup, SUBD, this);
    setAttribute(this.rootGroup, View.MARKER, this);

    // View mode
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
    const camera = sceneSetup.camera;
    const domElement = sceneSetup.renderer.domElement;

    this.gizmo = new TransformControls(camera, domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.setMode('translate');
    this.gizmo.visible = false;
    this.gizmo.enabled = false;

    // Disable camera controls while dragging the gizmo
    this.gizmo.addEventListener('dragging-changed', (event) => {
      sceneSetup.trackballControls.enabled = !event.value;
    });

    // Update vertex position on gizmo change
    this.gizmo.addEventListener('change', () => {
      if (this.selectedHandle) {
        const vi = this.selectedHandle.userData.vertexIndex;
        const pos = this.gizmoTarget.position;
        this.model.controlMesh.vertices[vi].position = [pos.x, pos.y, pos.z];
        this.selectedHandle.position.copy(pos);

        // Throttled recompute
        if (!this._recomputeTimer) {
          this._recomputeTimer = requestAnimationFrame(() => {
            this._recomputeTimer = null;
            this.model.recompute();
            this.rebuildGeometry();
          });
        }
      }
    });

    this.gizmo.addEventListener('mouseUp', () => {
      // Final recompute on release
      if (this.selectedHandle) {
        this.model.recompute();
        this.rebuildGeometry();
      }
    });

    // Add gizmo target and gizmo to the scene (not to rootGroup, gizmo needs to be at scene level)
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

  buildCageEdges(controlMesh) {
    while (this.cageGroup.children.length > 0) {
      const child = this.cageGroup.children[0];
      this.cageGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    const edges = controlMesh.getEdges();
    for (const [v0, v1, crease] of edges) {
      const p0 = controlMesh.vertices[v0].position;
      const p1 = controlMesh.vertices[v1].position;
      const positions = new Float32Array([p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]]);
      const geom = new BufferGeometry();
      geom.setAttribute('position', new BufferAttribute(positions, 3));

      const creaseNorm = Math.min(1, crease / 10); // normalize 0-10 to 0-1 for color
      const color = new Color(EDGE_COLOR).lerp(new Color(CREASE_EDGE_COLOR), creaseNorm);
      const mat = new LineBasicMaterial({color, linewidth: 2, depthTest: true});
      const line = new LineSegments(geom, mat);
      line.userData = {v0, v1, crease, isSubDEdge: true};

      line.onMouseEnter = () => {
        mat.color.setHex(0xffffff);
        this.ctx.viewer.requestRender();
      };
      line.onMouseLeave = () => {
        const cn = Math.min(1, line.userData.crease / 10);
        mat.color.copy(new Color(EDGE_COLOR).lerp(new Color(CREASE_EDGE_COLOR), cn));
        this.ctx.viewer.requestRender();
      };

      // Click edge → cycle crease weight (0%, 50%, 100%)
      line.onMouseClick = () => {
        const mesh = this.model.controlMesh;
        let newCrease;
        if (line.userData.crease < 2.5) newCrease = 5;   // 50%
        else if (line.userData.crease < 7.5) newCrease = 10;  // 100%
        else newCrease = 0;                               // 0%

        mesh.setEdgeCrease(v0, v1, newCrease);
        line.userData.crease = newCrease;
        this.model.recompute();
        this.rebuildGeometry();
      };

      this.cageGroup.add(line);
    }
  }

  buildHandles(controlMesh) {
    for (const h of this.handles) {
      this.handleGroup.remove(h);
      h.geometry.dispose();
      h.material.dispose();
    }
    this.handles = [];

    const handleGeom = new SphereGeometry(1);
    const sceneSetup = this.ctx.viewer.sceneSetup;

    for (let i = 0; i < controlMesh.vertices.length; i++) {
      const v = controlMesh.vertices[i];
      const mat = new MeshBasicMaterial({color: HANDLE_COLOR, depthTest: true, transparent: true, opacity: 0.8, visible: false});
      const sphere = new Mesh(handleGeom, mat);
      sphere.renderOrder = 1;

      const handle = new ConstantScaleGroup(sceneSetup, HANDLE_SIZE * 2, 1, () => handle.position);
      handle.position.set(v.position[0], v.position[1], v.position[2]);
      handle.add(sphere);
      handle.userData = {vertexIndex: i, isSubDHandle: true};

      sphere.onMouseEnter = () => {
        mat.visible = true;
        if (this.selectedHandle !== handle) {
          mat.color.setHex(HANDLE_HOVER_COLOR);
        }
        this.ctx.viewer.requestRender();
      };
      sphere.onMouseLeave = () => {
        if (this.selectedHandle !== handle) {
          mat.visible = false;
        }
        mat.color.setHex(HANDLE_COLOR);
        this.ctx.viewer.requestRender();
      };
      sphere.onMouseClick = () => {
        this.selectHandle(handle);
      };

      handle.__mat = mat;

      this.handleGroup.add(handle);
      this.handles.push(handle);
    }
  }

  rebuildGeometry() {
    const newGeom = buildSubDGeometry(this.model.mesh);
    this.solidMesh.geometry.dispose();
    this.solidMesh.geometry = newGeom;
    this.geometry = newGeom;

    const newWire = new WireframeGeometry(newGeom);
    this.wireframeMesh.geometry.dispose();
    this.wireframeMesh.geometry = newWire;
    this.wireframeGeometry = newWire;

    this.buildCageEdges(this.model.controlMesh);

    for (const h of this.handles) {
      const v = this.model.controlMesh.vertices[h.userData.vertexIndex];
      h.position.set(v.position[0], v.position[1], v.position[2]);
    }

    this.ctx.viewer.requestRender();
  }

  updateVisuals() {
    this.solidMesh.material.color.set(this.markColor || this.color || 0xbfbfbf);
  }

  dispose() {
    // Remove gizmo from scene
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
      if (h.__mat) h.__mat.dispose();
      h.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    while (this.cageGroup.children.length > 0) {
      const c = this.cageGroup.children[0];
      this.cageGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    super.dispose();
  }
}

function buildSubDGeometry(shellMesh) {
  if (!shellMesh) return new BufferGeometry();
  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(shellMesh.vertices, 3));
  geom.setAttribute('normal', new BufferAttribute(shellMesh.normals, 3));
  if (shellMesh.indices) {
    geom.setIndex(new BufferAttribute(shellMesh.indices, 1));
  }
  return geom;
}
