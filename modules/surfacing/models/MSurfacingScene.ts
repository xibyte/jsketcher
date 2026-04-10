/**
 * MObject wrapper for the Scene entity, providing backward compatibility
 * with cadRegistry, viewSyncBundle, and the craft pipeline.
 *
 * Internally maintains both a Scene entity (new system) and a PatchCage
 * (old system, used by PatchCageView until full migration).
 */
import {MObject, MObjectIdGenerator} from 'cad/model/mobject';
import {EntityKind} from 'cad/model/entities';
import {ShellMesh} from 'cad/model/mshell';
import {PatchCage, SerializedPatchCage} from './PatchCageCore';
import {Scene, SerializedScene} from './Scene/Scene.entity';
import {sceneFromPatchCage} from './Scene/fromPatchCage';
import {state, StateStream} from 'lstream';
import {Matrix3x4} from 'math/matrix';

export class MSurfacingScene extends MObject {

  static TYPE = EntityKind.SURFACING_SCENE;

  /** New entity system — the source of truth for the tree view */
  scene: Scene;

  /** Old system — used by PatchCageView for rendering until full migration */
  cage: PatchCage;

  tessResolution: number;
  mesh: ShellMesh | null = null;

  location$: StateStream<Matrix3x4> = state(new Matrix3x4());

  constructor(cage: PatchCage, tessResolution: number = 8) {
    super(MSurfacingScene.TYPE, MObjectIdGenerator.next(MSurfacingScene.TYPE, 'SS'));
    this.cage = cage;
    this.tessResolution = tessResolution;
    this.scene = sceneFromPatchCage(cage);
    this.scene.tessResolution = tessResolution;
    this.recompute();
  }

  recompute(): void {
    const tess = this.cage.tessellateAll(this.tessResolution);
    this.mesh = {
      vertices: tess.vertices,
      normals: tess.normals,
      indices: tess.indices,
      faceTriRanges: tess.patchTriRanges,
    };
  }

  /** Rebuild the Scene entity from the current PatchCage state */
  refreshSceneEntity(): void {
    this.scene = sceneFromPatchCage(this.cage);
    this.scene.tessResolution = this.tessResolution;
  }

  serializeCage(): SerializedPatchCage {
    return this.cage.serialize();
  }

  traverse(callback: (obj: MObject) => void): void {
    callback(this);
  }

  get parent() { return null; }
  get location() { return this.location$.value; }
}
