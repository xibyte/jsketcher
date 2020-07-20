import {TopoObject} from './topo-object'
import Vector from "math/vector";

export class Vertex extends TopoObject {

  point: Vector;
  
  constructor(point: Vector) {
    super();
    this.point = point;
  }
}