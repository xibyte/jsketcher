import {TopoObject} from './topo-object'
import {Point} from '../geom/point'

import * as math from '../../math/math'

export class Loop extends TopoObject {

  constructor(face) {
    super();
    this.face = face;
    this.halfEdges = [];
    this.encloses = undefined;
    this.defineIterable('encloses', () => enclosesGenerator(this.halfEdges));
  }

  isCCW(surface) {
    return Loop.isPolygonCCWOnSurface(this.asPolygon(), surface);
  }
  
  asPolygon() {
    return this.halfEdges.map(e => e.vertexA.point);
  }

  link() {
    let length = this.halfEdges.length;
    for (let i = 0; i < length; i++) {
      let j = (i + 1) % length;
      const curr = this.halfEdges[i];
      const next = this.halfEdges[j];
      curr.next = next;
      next.prev = curr;

      curr.loop = this;
    }
  }

  tess() {
    let out = [];
    for (let e of this.halfEdges) {
      let curvePoints = e.edge.curve.tessellate();
      if (e.inverted) {
        curvePoints.reverse();
      }
      curvePoints.pop();
      for (let point of curvePoints) {
        out.push(point);
      }
    }
    return out;
  }
}

export function* enclosesGenerator(halfEdges) {
  let length = halfEdges.length;
  for (let i = 0; i < halfEdges.length; i++) {
    let j = (i + 1) % length;
    const curr = halfEdges[i];
    const next = halfEdges[j];
    if (curr.vertexB !== next.vertexA) {
      __DEBUG__.AddHalfEdge(curr, 0xff1199);
      __DEBUG__.AddHalfEdge(next, 0x99ff11);
      throw 'using enclose generator on invalid Loop';       
    }
    yield [curr, next, curr.vertexB];
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