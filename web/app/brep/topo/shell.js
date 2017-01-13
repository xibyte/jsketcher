import {TopoObject} from './topo-object'

export class Shell extends TopoObject {
  constructor() {
    super();
    this.faces = [];
    this.defineIterable('vertices', () => verticesGenerator(this));
  }
}

export function* verticesGenerator(shell) {
  const seen = new Set();
  for (let face of shell.faces) {
    for (let edge of face.outerLoop.halfEdges) {
      if (!seen.has(edge.vertexA)) {
        seen.add(edge.vertexA);
        yield edge.vertexA;
      }
    }
  }
}
  