import {TopoObject} from './topo-object'

export class Shell extends TopoObject {
  constructor() {
    super();
    this.faces = [];
    this.defineIterable('vertices', () => verticesGenerator(this));
    this.defineIterable('edges', () => edges(this))
  }
  
  reindexVertices() {
    for (let e of this.edges) {
      e.halfEdge1.vertexA.edges.clear();
      e.halfEdge1.vertexB.edges.clear();
    }
    for (let e of this.edges) {
      e.halfEdge1.vertexA.edges.add(e.halfEdge1);
      e.halfEdge2.vertexA.edges.add(e.halfEdge2);
    }
  }
}

export function* verticesGenerator(shell) {
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

export function* edges(shell) {
  const visited = new Set();
  for (let face of shell.faces) {
    for (let halfEdge of face.edges) {
      if (!visited.has(halfEdge.edge)) {
        visited.add(halfEdge.edge);
        yield halfEdge.edge;
      }
    }
  }  
}
