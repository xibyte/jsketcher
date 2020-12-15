import {TopoObject} from './topo-object'
import {Vertex} from "./vertex";
import BrepCurve from "geom/curves/brepCurve";
import {Loop} from "./loop";
import Vector from "math/vector";
import {Tessellation1D} from "engine/tessellation";
import _ from 'lodash';
import {Point} from 'geom/point';
import { BREPValidator } from 'brep/brep-validator';

export class Edge extends TopoObject {

  curve: BrepCurve;
  halfEdge1: HalfEdge;
  halfEdge2: HalfEdge;

  constructor(curve: BrepCurve, a: Vertex, b: Vertex) {
    super();
    this.curve = curve;
    this.halfEdge1 = new HalfEdge(this, false, a, b);
    this.halfEdge2 = new HalfEdge(this, true, b, a);
  }

  static fromCurve(curve: BrepCurve): Edge {
    const a = new Vertex(curve.startPoint());
    const b = new Vertex(curve.endPoint());
    return new Edge(curve, a, b);
  }

  invert(): void {
    const t = this.halfEdge1;
    this.halfEdge1 = this.halfEdge2;
    this.halfEdge2 = t;
    this.halfEdge1.inverted = false;
    this.halfEdge2.inverted = true;
    this.curve = this.curve.invert();
  }
  
  clone(): Edge {
    let clone = new Edge(this.curve, this.halfEdge1.vertexA, this.halfEdge1.vertexB);
    Object.assign(clone.data, this.data);
    Object.assign(clone.halfEdge1.data, this.halfEdge1.data);
    Object.assign(clone.halfEdge2.data, this.halfEdge2.data);
    return clone;
  }

  splitByPoint(pt: Point) {

    const [c1, c2] = this.curve.split(pt);
    
    const e1 = Edge.fromCurve(c1);
    const e2 = Edge.fromCurve(c2);

    this.halfEdge1.insertAfter(e1.halfEdge1);
    e1.halfEdge1.insertAfter(e2.halfEdge1);

    let anchorIndex = this.halfEdge2.loop.halfEdges.indexOf(this.halfEdge2) - 1;
    if (anchorIndex == -1) {
      anchorIndex = this.halfEdge2.loop.halfEdges.length - 1;
    }
    
    const anchor = this.halfEdge2.loop.halfEdges[anchorIndex];
    
    anchor.insertAfter(e2.halfEdge2);
    e2.halfEdge2.insertAfter(e1.halfEdge2);

    this.halfEdge2.delete();
    this.halfEdge1.delete();
    // const errors = BREPValidator.validate(this.halfEdge1.loop.face.shell);
    // console.log(errors);
  }
}

export class HalfEdge extends TopoObject {

  edge: Edge;
  inverted: boolean;
  vertexA: Vertex;
  vertexB: Vertex;
  loop: Loop;
  next: HalfEdge;
  prev: HalfEdge;

  constructor(edge: Edge, inverted: boolean, a: Vertex, b: Vertex) {
    super();
    this.edge = edge;
    this.inverted = inverted;
    this.vertexA = a;
    this.vertexB = b;
    this.loop = null;
    this.next = null;
    this.prev = null;
  }

  twin(): HalfEdge {
    return this.edge.halfEdge1 === this ? this.edge.halfEdge2 : this.edge.halfEdge1;
  }

  tangentAtStart(): Vector {
    return this.tangent(this.vertexA.point);
  }

  tangentAtEnd(): Vector {
    return this.tangent(this.vertexB.point);
  }

  tangent(point: Vector): Vector {
    let tangent = this.edge.curve.tangentAtPoint(point);
    tangent._normalize();
    if (this.inverted) {
      tangent._negate();
    }
    return tangent;
  }

  tessellate(): Tessellation1D<Vector> {
    let res = this.edge.curve.tessellate.apply(this.edge.curve, arguments);
    if (this.inverted) {
      res = res.slice().reverse();
    }
    return res;
  }
  
  insertAfter(he: HalfEdge) {
    he.loop = this.loop;
    const next = this.next;    
    this.next = he;
    he.next = next;
    next.prev = he;
    he.prev = this;
    const index = this.loop.halfEdges.indexOf(this);
    this.loop.halfEdges.splice(index + 1, 0, he);
  }

  delete() {
    const next = this.next;    
    const prev = this.prev;
    prev.next = next;
    next.prev = prev;
    _.pull(this.loop.halfEdges, this);    
  }

  replace(he: HalfEdge) {
    if (this.edge.halfEdge1 === this) {
      this.edge.halfEdge1 = he;
    } else {
      this.edge.halfEdge2 = he;
    }

    he.edge = this.edge;
    he.loop = this.loop;
    
    he.prev = this.prev;
    he.prev.next = he;

    he.next = this.next;
    he.next.prev = he;
  }
}
