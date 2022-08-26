import {TopoObject} from './topo-object'
import {Face} from "./face";
import {Loop} from "./loop";
import {Vertex} from "brep/topo/vertex";
import {Edge} from "brep/topo/edge";
import {Matrix3x4} from "math/matrix";
import {BREPValidator} from "brep/brep-validator";
import CadError from "../../../web/app/utils/errors";


export class Shell extends TopoObject {

  faces: Face[];

  vertices = {
    [Symbol.iterator]: () => verticesGenerator(this)
  };

  edges = {
    [Symbol.iterator]: () => edgesGenerator(this.faces)
  };

  constructor() {
    super();
    this.faces = [];
  }

  clone(): Shell {
    const edgeClones = new Map();
    for (const e of this.edges) {
      edgeClones.set(e, e.clone());
    }

    const clone = new Shell();
    for (const face of this.faces) {
      const faceClone = new Face(face.surface);
      Object.assign(faceClone.data, face.data);
      const cloneLoop = (loop, loopClone) => {
        for (const he of loop.halfEdges) {
          const edgeClone = edgeClones.get(he.edge);
          loopClone.halfEdges.push(he.inverted ? edgeClone.halfEdge2 : edgeClone.halfEdge1);
        }
        loopClone.link();
        Object.assign(loopClone.data, loop.data);
      };
      cloneLoop(face.outerLoop, faceClone.outerLoop);
      for (const loop of face.innerLoops) {
        const loopClone = new Loop(faceClone);
        cloneLoop(loop, loopClone);
        faceClone.innerLoops.push(loopClone);
      }
      clone.faces.push(faceClone);
    }
    
    clone.faces.forEach(face => face.shell = clone);
    Object.assign(clone.data, this.data);
    return clone;
  }

  /**
   * Mutates the original shell applying the transformation. Transformation can be non-uniform.
   */
  transform(tr: Matrix3x4) {

    for (const v of this.vertices) {
      v.point = tr.apply(v.point);
    }

    const visited = new Set<any>();
    for (const e of this.edges) {
      if (visited.has(e.curve)) {
        continue;
      }
      visited.add(e.curve);
      e.curve = e.curve.transform(tr);
    }
    for (const face of this.faces) {
      if (visited.has(face.surface)) {
        continue;
      }
      visited.add(face.surface);
      face.surface = face.surface.transform(tr);
    }
  }

  invert( shell ) {
    for (const face of this.faces) {
      face.surface = face.surface.invert();
      for (const edge of this.edges) {
        edge.invert();
      }
      for (const loop of face.loops) {
        for (let i = 0; i < loop.halfEdges.length; i++) {
          loop.halfEdges[i] = loop.halfEdges[i].twin();
        }
        loop.halfEdges.reverse();
        loop.link();
      }
    }
    // @ts-ignore
    this.data.inverted = !this.data.inverted;
    const errors = BREPValidator.validate(this);
    if (errors.length !== 0) {
      throw new CadError({
        kind: CadError.KIND.INTERNAL_ERROR,
        code: 'unable to invert'
      });
    }
  }

  traverse(callback: (child: TopoObject) => any) {
    for (const face of this.faces) {
      callback(face);
    }
    for (const edge of this.edges) {
      callback(edge);
    }
    for (const vertex of this.vertices) {
      callback(vertex);
    }
  }
}

export function* verticesGenerator(shell: Shell): Generator<Vertex> {
  const seen = new Set();
  for (const face of shell.faces) {
    for (const edge of face.edges) {
      if (!seen.has(edge.vertexA)) {
        seen.add(edge.vertexA);
        yield edge.vertexA;
      }
    }
  }
}

export function* edgesGenerator(faces: Face[]): Generator<Edge> {
  const visited = new Set();
  for (const face of faces) {
    for (const halfEdge of face.edges) {
      if (!visited.has(halfEdge.edge)) {
        visited.add(halfEdge.edge);
        yield halfEdge.edge;
      }
    }
  }  
}
