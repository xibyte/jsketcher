import {MObject, MObjectIdGenerator} from './mobject';
import {EntityKind} from './entities';
import {ShellMesh} from './mshell';
import {SubDMesh} from 'subd/SubDMesh';
import {subdivideN, tessellateSubD} from 'subd/catmullClark';
import {state, StateStream} from "lstream";
import {Matrix3x4} from "math/matrix";

export interface FlatCaps {
  bottomVerts: [number, number, number][];
  topVerts: [number, number, number][];
  bottomZ: number;
  topZ: number;
}

export class MSubD extends MObject {

  static TYPE = EntityKind.SUBD;

  controlMesh: SubDMesh;
  subdivisionLevel: number;
  mesh: ShellMesh | null = null;
  subdividedMesh: SubDMesh | null = null;
  flatCaps: FlatCaps | null = null;

  location$: StateStream<Matrix3x4> = state(new Matrix3x4());

  constructor(controlMesh: SubDMesh, subdivisionLevel: number = 2, flatCaps?: FlatCaps) {
    super(MSubD.TYPE, MObjectIdGenerator.next(MSubD.TYPE, 'SD'));
    this.controlMesh = controlMesh;
    this.subdivisionLevel = subdivisionLevel;
    this.flatCaps = flatCaps || null;
    this.recompute();
  }

  recompute(): void {
    this.subdividedMesh = subdivideN(this.controlMesh, this.subdivisionLevel);
    const tess = tessellateSubD(this.subdividedMesh);

    let vertices = tess.vertices;
    let normals = tess.normals;
    let faceTriRanges = tess.faceTriRanges;

    // Append flat cap geometry if present
    if (this.flatCaps) {
      const capData = buildFlatCaps(this.flatCaps);
      const combined = new Float32Array(vertices.length + capData.vertices.length);
      combined.set(vertices);
      combined.set(capData.vertices, vertices.length);

      const combinedN = new Float32Array(normals.length + capData.normals.length);
      combinedN.set(normals);
      combinedN.set(capData.normals, normals.length);

      // Offset cap face ranges
      const existingTriCount = vertices.length / 9; // 3 verts * 3 components per tri
      for (const range of capData.faceTriRanges) {
        faceTriRanges.push([range[0] + existingTriCount, range[1] + existingTriCount]);
      }

      vertices = combined;
      normals = combinedN;
    }

    this.mesh = {
      vertices,
      normals,
      faceTriRanges,
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

function buildFlatCaps(caps: FlatCaps): {
  vertices: Float32Array,
  normals: Float32Array,
  faceTriRanges: [number, number][]
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const faceTriRanges: [number, number][] = [];
  let triIdx = 0;

  // Bottom cap — fan triangulation, normal pointing down
  const bv = caps.bottomVerts;
  const bn: [number, number, number] = [0, 0, -1];
  const bottomStart = triIdx;
  for (let i = 1; i < bv.length - 1; i++) {
    // Reversed winding for bottom (normal = -Z)
    positions.push(bv[0][0], bv[0][1], bv[0][2]);
    positions.push(bv[i + 1][0], bv[i + 1][1], bv[i + 1][2]);
    positions.push(bv[i][0], bv[i][1], bv[i][2]);
    normals.push(bn[0], bn[1], bn[2], bn[0], bn[1], bn[2], bn[0], bn[1], bn[2]);
    triIdx++;
  }
  faceTriRanges.push([bottomStart, triIdx]);

  // Top cap — fan triangulation, normal pointing up
  const tv = caps.topVerts;
  const tn: [number, number, number] = [0, 0, 1];
  const topStart = triIdx;
  for (let i = 1; i < tv.length - 1; i++) {
    positions.push(tv[0][0], tv[0][1], tv[0][2]);
    positions.push(tv[i][0], tv[i][1], tv[i][2]);
    positions.push(tv[i + 1][0], tv[i + 1][1], tv[i + 1][2]);
    normals.push(tn[0], tn[1], tn[2], tn[0], tn[1], tn[2], tn[0], tn[1], tn[2]);
    triIdx++;
  }
  faceTriRanges.push([topStart, triIdx]);

  return {
    vertices: new Float32Array(positions),
    normals: new Float32Array(normals),
    faceTriRanges,
  };
}
