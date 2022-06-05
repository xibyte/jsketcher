import {ClassifyPointToFace, IsEdgesOverlap} from "cad/craft/e0/interact";
import {newVector, Vec3} from "math/vec";
import * as vec from "math/vec";
import {Face} from "brep/topo/face";
import {Edge} from "brep/topo/edge";

export enum Classification {

  UNRELATED,

  SAME,

  PARTIAL

}

export interface Classifier {

  classifyFaceToFace(face1: Face, face2: Face): Classification;

  classifyEdgeToEdge(edge1: Edge, edge2: Edge): Classification;

  classifyEdgeToFace(edge: Edge, face: Face): Classification;

}

interface OCCExternals {
  ptr: number;
  evaluationPoints?: any;
}

enum OCCClassifyResult {

  UNRELATED,

  INSIDE,

  BOUNDS
}

export class OCCClassifier implements Classifier {

  classifyFaceToFace(face1: Face, face2: Face) {

    let wasMatch: boolean = false;
    let wasMissMatch: boolean = false;

    face2.data.externals.evaluationPoints.forEach((pt) => {
      const result = ClassifyPointToFace(face1.data.externals.ptr, pt[0], pt[1], pt[2], 1) as OCCClassifyResult;
      switch (result) {
        case OCCClassifyResult.BOUNDS:
        case OCCClassifyResult.INSIDE:
          wasMatch = true;
          break;
        case OCCClassifyResult.UNRELATED:
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

  };

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
      const result = ClassifyPointToFace(face.data.externals.ptr, pt[0], pt[1], pt[2], 1) as OCCClassifyResult;
      switch (result) {
        case OCCClassifyResult.BOUNDS:
        case OCCClassifyResult.INSIDE:
          wasMatch = true;
          break;
        case OCCClassifyResult.UNRELATED:
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

function centroidIterator(tesselation: any, callback: (pt: Vec3) => any) {
  for (let [tr, normales] of tesselation) {
    let centroid = newVector(3) as Vec3;
    tr.forEach(p => vec._add(centroid, p));
    vec._div(centroid, 3);
    callback(centroid);
  }
}