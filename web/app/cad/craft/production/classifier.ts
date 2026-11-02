import {Face} from "brep/topo/face";
import {Edge} from "brep/topo/edge";
import {Shell} from "brep/topo/shell";
import {vectorsEqual} from "math/equality";

export enum Classification {

  UNRELATED,

  EXACT,

  PARTIAL

}

export interface Classifier {

  prepare(shape: Shell): void;

  classifyFaceToFace(face1: Face, face2: Face): Classification;

  classifyEdgeToEdge(edge1: Edge, edge2: Edge): Classification;

  classifyEdgeToFace(edge: Edge, face: Face): Classification;

}

export class NativeClassifier implements Classifier {

  prepare(shell: Shell) {
    // No-op for native BREP - no external engine state to prepare
  }

  classifyFaceToFace(face1: Face, face2: Face): Classification {
    if (face1 === face2) {
      return Classification.EXACT;
    }
    if (face1.data.id && face2.data.id && face1.data.id === face2.data.id) {
      return Classification.EXACT;
    }

    const surface1 = face1.surface;
    const surface2 = face2.surface;
    if (!surface1 || !surface2) {
      return Classification.UNRELATED;
    }

    const n1 = surface1.normalInMiddle();
    const n2 = surface2.normalInMiddle();

    if (!n1 || !n2) {
      return Classification.UNRELATED;
    }

    const normalsMatch = vectorsEqual(n1, n2) || vectorsEqual(n1.negate(), n2);
    if (!normalsMatch) {
      return Classification.UNRELATED;
    }

    const p1 = surface1.pointInMiddle();

    const result = face2.rayCast(p1, surface2);
    if (result && result.inside) {
      return Classification.EXACT;
    }

    return Classification.UNRELATED;
  }

  classifyEdgeToEdge(edge1: Edge, edge2: Edge): Classification {
    if (edge1 === edge2) {
      return Classification.EXACT;
    }
    if (edge1.data.id && edge2.data.id && edge1.data.id === edge2.data.id) {
      return Classification.EXACT;
    }

    const curve1 = edge1.curve;
    const curve2 = edge2.curve;
    if (!curve1 || !curve2) {
      return Classification.UNRELATED;
    }

    const start1 = curve1.startPoint();
    const end1 = curve1.endPoint();
    const start2 = curve2.startPoint();
    const end2 = curve2.endPoint();

    const startMatch = vectorsEqual(start1, start2) || vectorsEqual(start1, end2);
    const endMatch = vectorsEqual(end1, start2) || vectorsEqual(end1, end2);

    if (startMatch && endMatch) {
      const mid1 = curve1.middlePoint();
      const mid2 = curve2.middlePoint();
      if (vectorsEqual(mid1, mid2)) {
        return Classification.EXACT;
      }
      return Classification.PARTIAL;
    }

    return Classification.UNRELATED;
  }

  classifyEdgeToFace(edge: Edge, face: Face): Classification {
    const curve = edge.curve;
    if (!curve) {
      return Classification.UNRELATED;
    }

    const midPoint = curve.middlePoint();
    const result = face.rayCast(midPoint, face.surface);
    if (result && result.inside) {
      return Classification.EXACT;
    }

    return Classification.UNRELATED;
  }
}
