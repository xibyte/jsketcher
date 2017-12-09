import {TopoObject} from './topo-object'
import {Vertex} from "./vertex";
import {Point} from "../geom/point";

export class Edge extends TopoObject {

  constructor(curve, a, b) {
    super();
    this.curve = curve;
    this.halfEdge1 = new HalfEdge(this, false, a, b);
    this.halfEdge2 = new HalfEdge(this, true, b, a);
    a.edges.add(this.halfEdge1);
    b.edges.add(this.halfEdge2);
  }

  static fromCurve(curve) {
    const a = new Vertex(curve.point(0));
    const b = new Vertex(curve.point(1));
    return new Edge(curve, a, b);
  }

  invert() {
    const t = this.halfEdge1;
    this.halfEdge1 = this.halfEdge2;
    this.halfEdge2 = t;
    this.halfEdge1.inverted = false;
    this.halfEdge2.inverted = true;
    this.curve = this.curve.invert();
  }
  
  clone() {
    let clone = new Edge(this.curve, this.halfEdge1.vertexA, this.halfEdge1.vertexB);
    Object.assign(clone.data, this.data);
    Object.assign(clone.halfEdge1.data, this.halfEdge1.data);
    Object.assign(clone.halfEdge2.data, this.halfEdge2.data);
    return clone;
  }
}

class HalfEdge extends TopoObject {

  constructor(edge, inverted, a, b) {
    super();
    this.edge = edge;
    this.inverted = inverted;
    this.vertexA = a;
    this.vertexB = b;
    this.loop = null;
    this.next = null;
    this.prev = null;
    this.manifold = null;
    this.manifoldHolder = null;
  }

  twin() {
    let twin = this.edge.halfEdge1 === this ? this.edge.halfEdge2 : this.edge.halfEdge1;
    return twin.manifoldHolder === null ? twin : twin.manifoldHolder; 
  }

  twins() {
    return this.manifold === null ? [this.twin()] : [this.twin(), ...this.manifold.map(me => me.twin())];
  }

  tangent(point) {
    let tangent = this.edge.curve.tangentAtPoint(point);
    tangent._normalize();
    if (this.inverted) {
      tangent._negate();
    }
    return tangent;
  }

  tessellate() {
    let res = this.edge.curve.tessellate.apply(this.edge.curve, arguments);
    if (this.inverted) {
      res = res.slice().reverse();
    }
    return res;
  }
  
  attachManifold(he) {
    if (this.manifold === null) {
      this.manifold = [];
    }
    if (this.manifold.indexOf(he) === -1) {
      this.manifold.push(he);
    }
    he.manifoldHolder = this;
  }
}
