import {Edge} from './topo/edge';
import BrepCurve from '../../../modules/geom/curves/brepCurve';

export default class EdgeIndex {
  
  constructor() {
    this.index = new Map();
  }

  addEdge(edge, tag) {
    if (edge.halfEdge1) {
      this.addHalfEdge(edge.halfEdge1, tag);
    }
    if (edge.halfEdge2) {
      this.addHalfEdge(edge.halfEdge2, tag);
    }
  }

  addHalfEdge(he, tag) {
    this._edgesForVertex(he.vertexA).add([he, tag]);
  }

  _edgesForVertex(v) {
    let edges = this.index.get(v);
    if (!edges) {
      edges = new Set();
      this.index.set(v, edges);
    }
    return edges;
  }

  getHalfEdge(a, b, tag) {
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

  getHalfEdgeOrCreate(a, b, curveCreate, invertedToCurve, tag) {
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