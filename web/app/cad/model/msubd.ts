import {MObject, MObjectIdGenerator} from './mobject';
import {EntityKind} from './entities';
import {ShellMesh} from './mshell';
import {SubDMesh} from 'subd/SubDMesh';
import {subdivideN, tessellateSubD} from 'subd/catmullClark';
import {state, StateStream} from "lstream";
import {Matrix3x4} from "math/matrix";

export class MSubD extends MObject {

  static TYPE = EntityKind.SUBD;

  controlMesh: SubDMesh;
  subdivisionLevel: number;
  mesh: ShellMesh | null = null;
  subdividedMesh: SubDMesh | null = null;

  location$: StateStream<Matrix3x4> = state(new Matrix3x4());

  constructor(controlMesh: SubDMesh, subdivisionLevel: number = 2) {
    super(MSubD.TYPE, MObjectIdGenerator.next(MSubD.TYPE, 'SD'));
    this.controlMesh = controlMesh;
    this.subdivisionLevel = subdivisionLevel;
    this.recompute();
  }

  recompute(): void {
    this.subdividedMesh = subdivideN(this.controlMesh, this.subdivisionLevel);
    const tess = tessellateSubD(this.subdividedMesh);
    this.mesh = {
      vertices: tess.vertices,
      normals: tess.normals,
      faceTriRanges: tess.faceTriRanges,
    };
  }

  traverse(callback: (obj: MObject) => void): void {
    callback(this);
  }

  get parent() {
    return null;
  }

  get location() {
    return this.location$.value;
  }
}
