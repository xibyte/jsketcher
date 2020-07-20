import {TopoObject} from './topo-object'
import {Face} from "./face";
import {Loop} from "./loop";
import {Vertex} from "brep/topo/vertex";
import {Edge} from "brep/topo/edge";


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
    let edgeClones = new Map();
    for (let e of this.edges) {
      edgeClones.set(e, e.clone());
    }

    let clone = new Shell();
    for (let face of this.faces) {
      let faceClone = new Face(face.surface);
      Object.assign(faceClone.data, face.data);
      const cloneLoop = (loop, loopClone) => {
        for (let he of loop.halfEdges) {
          let edgeClone = edgeClones.get(he.edge);
          loopClone.halfEdges.push(he.inverted ? edgeClone.halfEdge2 : edgeClone.halfEdge1);
        }
        loopClone.link();
        Object.assign(loopClone.data, loop.data);
      };
      cloneLoop(face.outerLoop, faceClone.outerLoop);
      for (let loop of face.innerLoops) {
        let loopClone = new Loop(faceClone);
        cloneLoop(loop, loopClone);
        faceClone.innerLoops.push(loopClone);
      }
      clone.faces.push(faceClone);
    }
    
    clone.faces.forEach(face => face.shell = clone);
    Object.assign(clone.data, this.data);
    return clone;
  }
}

export function* verticesGenerator(shell: Shell): Generator<Vertex> {
  const seen = new Set();
  for (let face of shell.faces) {
    for (let edge of face.edges) {
      if (!seen.has(edge.vertexA)) {
        seen.add(edge.vertexA);
        yield edge.vertexA;
      }
    }
  }
}

export function* edgesGenerator(faces: Face[]): Generator<Edge> {
  const visited = new Set();
  for (let face of faces) {
    for (let halfEdge of face.edges) {
      if (!visited.has(halfEdge.edge)) {
        visited.add(halfEdge.edge);
        yield halfEdge.edge;
      }
    }
  }  
}
