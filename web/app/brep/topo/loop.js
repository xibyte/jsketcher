import {TopoObject} from './topo-object'

import {Matrix3} from '../../math/l3space'
import * as math from '../../math/math'

export class Loop extends TopoObject {

  constructor() {
    super();
    this.face = null;
    this.halfEdges = [];
  }

  isCCW(surface) {
    const tr = new Matrix3().setBasis(surface.calculateBasis());
    const polygon = this.asPolygon();
    const polygon2d = polygon.map(p => tr.apply(p));
    const lowestLeftIdx = math.findLowestLeftPoint(polygon2d);
    const n = polygon.length;
    const nextIdx = ((lowestLeftIdx + 1) % n);
    const prevIdx = ((n - lowestLeftIdx - 1) % n);
    const o = polygon[lowestLeftIdx];
    const first = polygon[nextIdx].minus(o);
    const last = o.minus(polygon[prevIdx]);
    return last.cross(first).dot(surface.normal) >= 0;
  }
  
  asPolygon() {
    return this.halfEdges.map(e => e.vertexA.point);
  }
}