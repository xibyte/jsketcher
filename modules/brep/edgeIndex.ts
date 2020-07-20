import {Edge, HalfEdge} from './topo/edge';
import BrepCurve from 'geom/curves/brepCurve';
import {Vertex} from "brep/topo/vertex";

export type Tag = string | number;

export default class EdgeIndex {

  index: Map<Vertex, Set<[HalfEdge, Tag]>>;
  
  constructor() {
    this.index = new Map();
  }

  addEdge(edge: Edge, tag: Tag) {
    if (edge.halfEdge1) {
      this.addHalfEdge(edge.halfEdge1, tag);
    }
    if (edge.halfEdge2) {
      this.addHalfEdge(edge.halfEdge2, tag);
    }
  }

  addHalfEdge(he: HalfEdge, tag: Tag) {
    this._edgesForVertex(he.vertexA).add([he, tag]);
  }

  _edgesForVertex(v: Vertex): Set<[HalfEdge, Tag]> {
    let edges = this.index.get(v);
    if (!edges) {
      edges = new Set();
      this.index.set(v, edges);
    }
    return edges;
  }

  getHalfEdge(a: Vertex, b: Vertex, tag?: Tag): HalfEdge {
    let edges = this.index.get(a);
    if (edges) {
      for (let [he, _tag] of edges) {
        if (he.vertexB === b && (tag === undefined || tag === _tag)) {
          return he;
        }
      }
    }
    return null;
  }

  getHalfEdgeOrCreate(a: Vertex, b: Vertex, curveCreate?: () => BrepCurve, invertedToCurve?: boolean, tag?: Tag): HalfEdge {
    let he = this.getHalfEdge(a, b, tag);
    if (he === null) {
      let curve;
      if (curveCreate) {
        curve = curveCreate();
      }
      if (!curve) {
        curve = BrepCurve.createLinearCurve(a.point, b.point);
      }
      const e = new Edge(curve, invertedToCurve?b:a, invertedToCurve?a:b);
      he = invertedToCurve ? e.halfEdge2 : e.halfEdge1;
      this.addEdge(e, tag);
    }
    return he;
  }
}