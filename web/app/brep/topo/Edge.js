import {TopoObject} from './topo-object'

export class Edge extends TopoObject {

  constructor(curve) {
    super();
    this.curve = curve;
    this.halfEdge1 = null;
    this.halfEdge2 = null;
  }
}

export class HalfEdge {

  constructor() {
    this.edge = null;
    this.vertexA = null;
    this.vertexB = null;
    this.loop = null;
    this.next = null;
    this.prev = null;
  }
  
  twin() {
    return this.edge.halfEdge1 == this ? this.edge.halfEdge2 : this.edge.halfEdge1;
  }
  
}