import {TopoObject} from './topo-object'

import * as math from '../../math/math'

export class Loop extends TopoObject {

  constructor() {
    super();
    this.face = null;
    this.halfEdges = [];
  }

  isCCW(surface) {
    Loop.isPolygonCCWOnSurface(this.asPolygon(), surface);
  }
  
  asPolygon() {
    return this.halfEdges.map(e => e.vertexA.point);
  }
}

Loop.isPolygonCCWOnSurface = function(polygon, surface) {
  const tr = surface.get2DTransformation();
  const polygon2d = polygon.map(p => tr.apply(p));
  const lowestLeftIdx = math.findLowestLeftPoint(polygon2d);
  const n = polygon.length;
  const nextIdx = ((lowestLeftIdx + 1) % n);
  const prevIdx = ((n + lowestLeftIdx - 1) % n);
  const o = polygon[lowestLeftIdx];
  const first = polygon[nextIdx].minus(o);
  const last = o.minus(polygon[prevIdx]);
  return last.cross(first).dot(surface.normal) >= 0;
};