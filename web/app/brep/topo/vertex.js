import {TopoObject} from './topo-object'

export class Vertex extends TopoObject {
  
  constructor(point) {
    super();
    this.point = point;
    this.edges = new Set();
  }
 
  edgeFor(other) {
    for (let e of this.edges) {
      if (e.vertexB == other) {
        return e;
      }
    }
    return null;
  }
}