import {MObject, MObjectIdGenerator} from './mobject';
import {EntityKind} from './entities';
import {ShellMesh} from './mshell';
import {PatchCage, SerializedPatchCage} from 'surfacing/models/Scene/PatchCageCore';
import {state, StateStream} from "lstream";
import {Matrix3x4} from "math/matrix";

export class MPatchCage extends MObject {

  static TYPE = EntityKind.PATCH_CAGE;

  cage: PatchCage;
  tessResolution: number;
  mesh: ShellMesh | null = null;

  location$: StateStream<Matrix3x4> = state(new Matrix3x4());

  constructor(cage: PatchCage, tessResolution: number = 8) {
    super(MPatchCage.TYPE, MObjectIdGenerator.next(MPatchCage.TYPE, 'PC'));
    this.cage = cage;
    this.tessResolution = tessResolution;
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

  serializeCage(): SerializedPatchCage {
    return this.cage.serialize();
  }

  traverse(callback: (obj: MObject) => void): void {
    callback(this);
  }

  get parent() { return null; }
  get location() { return this.location$.value; }
}
