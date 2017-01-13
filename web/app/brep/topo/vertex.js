import {TopoObject} from './topo-object'

export class Vertex extends TopoObject {
  
  constructor(point) {
    super();
    this.point = point;
    this.edges = [];
  }
  
}