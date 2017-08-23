import {TopoObject} from './topo-object'

export class Edge extends TopoObject {

  constructor(curve) {
    super();
    this.curve = curve;
    this.halfEdge1 = null;
    this.halfEdge2 = null;
  }

  link(halfEdge1, halfEdge2) {
    halfEdge1.edge = this;
    halfEdge2.edge = this;
    this.halfEdge1 = halfEdge1;
    this.halfEdge2 = halfEdge2;
  }
}

export class HalfEdge extends TopoObject {

  constructor() {
    super();
    this.edge = null;
    this.vertexA = null;
    this.vertexB = null;
    this.loop = null;
    this.next = null;
    this.prev = null;
  }
  
  static create(a, b, loop, edge) {
    const e = new HalfEdge().setAB(a, b);
    e.loop = loop;
    e.edge = edge;
    return e;
  }
  
  setAB(a, b) {
    this.vertexA = a;
    this.vertexB = b;
    return this;
  }
  
  twin() {
    return this.edge.halfEdge1 == this ? this.edge.halfEdge2 : this.edge.halfEdge1;
  }

  
  splitHalfEdge(vertex) {
    const h = this;
    const newEdge = new HalfEdge();
    newEdge.vertexA = vertex;
    newEdge.vertexB = h.vertexB;
    h.vertexB = newEdge.vertexA;

    h.vertexA.edges.add(newEdge);
    h.vertexA.edges.delete(h);
    vertex.edges.add(newEdge);
    
    return newEdge;
  }
  
  split(vertex) {

    const orig = this;
    const twin = orig.twin();

    if (orig.vertexA == vertex || orig.vertexB == vertex) {
      return;
    }

    const newOrig = orig.splitHalfEdge(vertex);
    const newTwin = twin.splitHalfEdge(vertex);


    orig.edge.link(orig, newTwin);
    new Edge(orig.edge.curve).link(twin, newOrig);

    orig.loop.halfEdges.splice(orig.loop.halfEdges.indexOf(orig) + 1, 0, newOrig);
    twin.loop.halfEdges.splice(twin.loop.halfEdges.indexOf(twin) + 1, 0, newTwin);

    function insertToLL(orig, newOrig) {
      orig.next.prev = newOrig
      newOrig.next = orig.next;
      orig.next = newOrig;
      newOrig.prev = orig;
    }

    insertToLL(orig, newOrig);
    insertToLL(twin, newTwin);

    newOrig.loop = orig.loop;
    newTwin.loop = twin.loop;
  }
}

HalfEdge.fromVertices = function(a, b, curve) {
  const halfEdge1 = new HalfEdge();
  const halfEdge2 = new HalfEdge();

  halfEdge1.setAB(a, b);
  halfEdge2.setAB(b, a);
  
  new Edge(curve).link(halfEdge1, halfEdge2);
  return halfEdge1;
};