/**
 * MObject wrapper for the Scene entity, providing compatibility with
 * cadRegistry and viewSyncBundle. The Scene entity IS the model state.
 */
import {MObject, MObjectIdGenerator} from 'cad/model/mobject';
import {EntityKind} from 'cad/model/entities';
import {ShellMesh} from 'cad/model/mshell';
import {Scene, SerializedScene} from './Scene/Scene.entity';
import {state, StateStream} from 'lstream';
import {Matrix3x4} from 'math/matrix';

export class MSurfacingScene extends MObject {

  static TYPE = EntityKind.SURFACING_SCENE;

  /** The single source of truth: a Scene entity */
  scene: Scene;

  tessResolution: number;
  mesh: ShellMesh | null = null;

  location$: StateStream<Matrix3x4> = state(new Matrix3x4());

  constructor(scene: Scene, tessResolution: number = 8) {
    super(MSurfacingScene.TYPE, MObjectIdGenerator.next(MSurfacingScene.TYPE, 'SS'));
    this.scene = scene;
    this.tessResolution = tessResolution;
    this.scene.tessResolution = tessResolution;
    this.recompute();
  }

  /** Backward-compat alias: the Scene IS the cage */
  get cage(): Scene { return this.scene; }
  set cage(s: Scene) { this.scene = s; }

  recompute(): void {
    const tess = this.scene.tessellateAll(this.tessResolution);
    this.mesh = {
      vertices: tess.vertices,
      normals: tess.normals,
      indices: tess.indices,
      faceTriRanges: tess.patchTriRanges,
    };
  }

  /** Rebuild the Scene's entity-graph children (Groups containing surfaces) */
  refreshSceneEntity(): void {
    this.scene.syncEntityGraph();
  }

  serialize(): SerializedScene {
    return this.scene.serialize();
  }

  /** Backward-compat alias */
  serializeCage(): SerializedScene {
    return this.serialize();
  }

  traverse(callback: (obj: MObject) => void): void {
    callback(this);
  }

  get parent() { return null; }
  get location() { return this.location$.value; }
}
