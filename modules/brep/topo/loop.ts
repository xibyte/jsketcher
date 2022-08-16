import {TopoObject} from './topo-object'
import {Face} from "./face";
import {BrepSurface} from "geom/surfaces/brepSurface";
import {HalfEdge} from "./edge";
import {findLowestLeftPoint} from "geom/euclidean";
import {Vertex} from "brep/topo/vertex";

export class Loop extends TopoObject {

  face: Face;
  halfEdges: HalfEdge[];

  encloses = {
    [Symbol.iterator]: () => enclosesGenerator(this.halfEdges)
  };

  constructor(face: Face) {
    super();
    this.face = face;
    this.halfEdges = [];
  }

  isCCW(surface: BrepSurface) {
    return Loop.isPolygonCCWOnSurface(this.asPolygon(), surface);
  }
  
  asPolygon() {
    return this.halfEdges.map(e => e.vertexA.point);
  }

  link() {
    const length = this.halfEdges.length;
    for (let i = 0; i < length; i++) {
      const j = (i + 1) % length;
      const curr = this.halfEdges[i];
      const next = this.halfEdges[j];
      curr.next = next;
      next.prev = curr;

      curr.loop = this;
    }
  }

  tess() {
    const out = [];
    for (const e of this.halfEdges) {
      const curvePoints = e.edge.curve.tessellate();
      if (e.inverted) {
        curvePoints.reverse();
      }
      curvePoints.pop();
      for (const point of curvePoints) {
        out.push(point);
      }
    }
    return out;
  }

  private static isPolygonCCWOnSurface(polygon: any[], surface: BrepSurface) {
    const tr = surface.simpleSurface.get2DTransformation();
    const polygon2d = polygon.map(p => tr.apply(p));
    const lowestLeftIdx = findLowestLeftPoint(polygon2d);
    const n = polygon.length;
    const nextIdx = ((lowestLeftIdx + 1) % n);
    const prevIdx = ((n + lowestLeftIdx - 1) % n);
    const o = polygon[lowestLeftIdx];
    const first = polygon[nextIdx].minus(o);
    const last = o.minus(polygon[prevIdx]);
    return last.cross(first).dot(surface.normal) >= 0;
  }
}

export function* enclosesGenerator(halfEdges): Generator<[HalfEdge, HalfEdge, Vertex]> {
  const length = halfEdges.length;
  for (let i = 0; i < halfEdges.length; i++) {
    const j = (i + 1) % length;
    const curr = halfEdges[i];
    const next = halfEdges[j];
    if (curr.vertexB !== next.vertexA) {
      // @ts-ignore
      __DEBUG__.AddHalfEdge(curr, 0xff1199);
      // @ts-ignore
      __DEBUG__.AddHalfEdge(next, 0x99ff11);
      throw 'using enclose generator on invalid Loop';       
    }
    yield [curr, next, curr.vertexB];
  }
}


