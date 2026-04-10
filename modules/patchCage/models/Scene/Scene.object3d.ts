import {Group, Object3D} from 'three';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls';
import type {Scene as PatchScene} from './Scene.entity';
import type {NurbsSurface} from '../NurbsSurface/NurbsSurface.entity';
import {NurbsSurfaceObject3D} from '../NurbsSurface/NurbsSurface.object3d';

/**
 * Three.js Object3D for the Scene entity.
 * Root group containing all surface meshes and the transform gizmo.
 */
export class SceneObject3D extends Group {

  scene: PatchScene;
  gizmoTarget: Object3D;
  gizmo: TransformControls;
  surfaceObjects: Map<NurbsSurface, NurbsSurfaceObject3D> = new Map();

  private sceneSetup: any;

  constructor(patchScene: PatchScene, sceneSetup: any) {
    super();
    this.scene = patchScene;
    this.sceneSetup = sceneSetup;

    // Create surface Object3Ds for all existing surfaces
    for (const surface of patchScene.surfaces) {
      this.addSurfaceObject(surface);
    }

    // Gizmo for handle manipulation
    this.gizmoTarget = new Object3D();
    this.gizmo = new TransformControls(sceneSetup.camera, sceneSetup.renderer.domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.setMode('translate');
    this.gizmo.visible = false;
    this.gizmo.enabled = false;

    this.gizmo.addEventListener('dragging-changed', (e: any) => {
      sceneSetup.trackballControls.enabled = !e.value;
    });

    sceneSetup.scene.add(this.gizmoTarget);
    sceneSetup.scene.add(this.gizmo);
  }

  addSurfaceObject(surface: NurbsSurface): NurbsSurfaceObject3D {
    const obj = new NurbsSurfaceObject3D(surface, this.scene.tessResolution);
    surface.object3d = obj;
    this.surfaceObjects.set(surface, obj);
    this.add(obj);
    return obj;
  }

  removeSurfaceObject(surface: NurbsSurface): void {
    const obj = this.surfaceObjects.get(surface);
    if (obj) {
      this.remove(obj);
      obj.dispose();
      this.surfaceObjects.delete(surface);
      surface.object3d = null;
    }
  }

  /** Rebuild all surface geometries after changes */
  rebuildAll(): void {
    for (const [surface, obj] of this.surfaceObjects) {
      obj.rebuild(surface, this.scene.tessResolution);
    }
  }

  attachGizmo(target: Object3D): void {
    this.gizmoTarget.position.copy(target.position);
    this.gizmo.attach(this.gizmoTarget);
    this.gizmo.visible = true;
    this.gizmo.enabled = true;
  }

  detachGizmo(): void {
    this.gizmo.detach();
    this.gizmo.visible = false;
    this.gizmo.enabled = false;
  }

  dispose(): void {
    for (const [, obj] of this.surfaceObjects) {
      obj.dispose();
    }
    this.surfaceObjects.clear();
    this.gizmo.detach();
    this.gizmo.dispose();
    const s = this.sceneSetup.scene;
    s.remove(this.gizmo);
    s.remove(this.gizmoTarget);
  }
}
