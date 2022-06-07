import {ClassifyFaceToFace, ClassifyPointToFace, IsEdgesOverlap, UpdateTessellation} from "cad/craft/e0/interact";
import {Face} from "brep/topo/face";
import {Edge} from "brep/topo/edge";
import {Shell} from "brep/topo/shell";

export enum Classification {

  UNRELATED,

  SAME,

  PARTIAL

}

export interface Classifier {

  prepare(shape: Shell): void;

  classifyFaceToFace(face1: Face, face2: Face): Classification;

  classifyEdgeToEdge(edge1: Edge, edge2: Edge): Classification;

  classifyEdgeToFace(edge: Edge, face: Face): Classification;

}

interface OCCExternals {
  ptr: number;
}

enum OCCGeomClassifyResult {

  UNRELATED,

  INSIDE,

  BOUNDS
}

export class OCCClassifier implements Classifier {

  tol = 1e-3;
  tessDeflection = 2;

  prepare(shell: Shell) {
    const ptr = shell.data.externals.ptr;
    if (ptr) {
      UpdateTessellation(ptr, this.tessDeflection);
    } else {
      debugger;
    }
  }

  classifyFaceToFace(face1: Face, face2: Face) {
    return ClassifyFaceToFace(face1.data.externals.ptr, face2.data.externals.ptr, this.tol);
  }

  classifyEdgeToEdge(edge1: Edge, edge2: Edge): Classification {
    if (IsEdgesOverlap(edge1.data.externals.ptr, edge2.data.externals.ptr, 1e-3)) {
      return Classification.PARTIAL;
    } else {
      return Classification.UNRELATED;
    }
  }

  classifyEdgeToFace(edge: Edge, face: Face): Classification {

    let wasMatch: boolean = false;
    let wasMissMatch: boolean = false;

    edge.data.tessellation.forEach(pt => {
      const result = ClassifyPointToFace(face.data.externals.ptr, pt[0], pt[1], pt[2], 1) as OCCGeomClassifyResult;
      switch (result) {
        case OCCGeomClassifyResult.BOUNDS:
        case OCCGeomClassifyResult.INSIDE:
          wasMatch = true;
          break;
        case OCCGeomClassifyResult.UNRELATED:
        default:
          wasMissMatch = true;
      }

    });

    if (wasMatch && !wasMissMatch) {
      return Classification.SAME;
    } else if (wasMatch && wasMissMatch) {
      return Classification.PARTIAL;
    } else {
      return Classification.UNRELATED;
    }

  }
}
