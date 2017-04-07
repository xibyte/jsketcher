import {Shell} from './topo/shell'
import {Vertex} from './topo/vertex'
import {Loop} from './topo/loop'
import {Face} from './topo/face'
import {HalfEdge, Edge} from './topo/edge'
import {Line} from './geom/impl/line'
import {ApproxCurve, ApproxSurface} from './geom/impl/approx'
import {Plane} from './geom/impl/plane'
import {Point} from './geom/point'
import {BasisForPlane, Matrix3} from '../math/l3space'
import {CompositeCurve} from './geom/curve' 
import * as cad_utils from '../3d/cad-utils'
import * as math from '../math/math'

function isCCW(points, normal) {
  const tr2d = new Matrix3().setBasis(BasisForPlane(normal)).invert();
  const points2d = points.map(p => tr2d.apply(p));
  return math.isCCW(points2d);
}

function checkCCW(points, normal) {
  if (!isCCW(points, normal)) {
    points = points.slice();
    points.reverse();
  }
  return points;
}

export function createPrism(basePoints, height) {
  const normal = cad_utils.normalOfCCWSeq(basePoints);
  const baseSurface = new Plane(normal, normal.dot(basePoints[0]));
  const extrudeVector = baseSurface.normal.multiply( - height);
  const lidSurface = baseSurface.translate(extrudeVector).invert();
  const lidPoints = basePoints.map(p => p.plus(extrudeVector));
  const basePath = new CompositeCurve();
  const lidPath = new CompositeCurve();
  
  for (let i = 0; i < basePoints.length; i++) {
    let j = (i + 1) % basePoints.length;
    basePath.add(Line.fromSegment(basePoints[i], basePoints[j]), basePoints[i], null);
    lidPath.add(Line.fromSegment(lidPoints[i], lidPoints[j]), lidPoints[i], null);
  }
  return enclose(basePath, lidPath, baseSurface, lidSurface, () => {});
}


export function enclose(basePath, lidPath, baseSurface, lidSurface, onWallF) {

  if (basePath.points.length != lidPath.points.length) {
    throw 'illegal arguments';
  }

  const baseLoop = new Loop();
  const lidLoop = new Loop();
  
  const shell = new Shell();
  const baseVertices = basePath.points.map(p => new Vertex(p));
  const lidVertices = lidPath.points.map(p => new Vertex(p));
  
  const n = basePath.points.length;
  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    const baseHalfEdge = new HalfEdge().setAB(baseVertices[i], baseVertices[j]);
    const lidHalfEdge = new HalfEdge().setAB(lidVertices[j], lidVertices[i]);
    
    baseHalfEdge.edge = new Edge(basePath.curves[i]);
    lidHalfEdge.edge = new Edge(lidPath.curves[i]);

    baseHalfEdge.edge.halfEdge1 = baseHalfEdge;
    lidHalfEdge.edge.halfEdge1 = lidHalfEdge;


    baseHalfEdge.loop = baseLoop;
    baseLoop.halfEdges.push(baseHalfEdge);

    lidHalfEdge.loop = lidLoop;
    lidLoop.halfEdges[(n + n - 2 - i) % n] = lidHalfEdge; // keep old style order for the unit tests

    const wallFace = createFaceFromTwoEdges(createTwin(baseHalfEdge), createTwin(lidHalfEdge));
    
    wallFace.role = 'wall:' + i;
    onWallF(wallFace, basePath.groups[i]);
    shell.faces.push(wallFace);
  }
  
  iterateSegments(shell.faces, (a, b) => {
    const halfEdgeA = a.outerLoop.halfEdges[3];
    const halfEdgeB = b.outerLoop.halfEdges[1];
    const curve = Line.fromSegment(halfEdgeA.vertexA.point, halfEdgeA.vertexB.point);
    linkHalfEdges(new Edge(curve), halfEdgeA, halfEdgeB);
  });

  linkSegments(baseLoop.halfEdges);
  linkSegments(lidLoop.halfEdges);
  
  const baseFace = createFace(baseSurface, baseLoop);
  const lidFace = createFace(lidSurface, lidLoop);
  baseFace.role = 'base';
  lidFace.role = 'lid';

  shell.faces.push(baseFace, lidFace);
  shell.faces.forEach(f => f.shell = shell);
  return shell;
}

function createTwin(halfEdge) {
  const twin = new HalfEdge();
  twin.vertexA = halfEdge.vertexB;
  twin.vertexB = halfEdge.vertexA;
  twin.edge = halfEdge.edge;
  if (halfEdge.edge.halfEdge1 == halfEdge) {
    halfEdge.edge.halfEdge2 = twin;
  }  else {
    halfEdge.edge.halfEdge1 = twin;
  }
  return twin;
}

function createFace(surface, loop) {
  const face = new Face(surface);
  face.outerLoop = loop;
  loop.face = face;
  return face;
}


function createPlaneForLoop(normal, loop) {
  const w = loop.halfEdges[0].vertexA.point.dot(normal);
  const plane = new Plane(normal, w);
  return plane;
}

function createPlaneFace(normal, loop) {
  const plane = createPlaneForLoop();
  const face = new Face(plane);
  face.outerLoop = loop;
  loop.face = face;
  return face;
}


export function linkHalfEdges(edge, halfEdge1, halfEdge2) {
  halfEdge1.edge = edge;
  halfEdge2.edge = edge;
  edge.halfEdge1 = halfEdge1;
  edge.halfEdge2 = halfEdge2;
}

export function createHalfEdge(loop, vertexA, vertexB) {
  const halfEdge = new HalfEdge();
  halfEdge.loop = loop;
  halfEdge.vertexA = vertexA;
  halfEdge.vertexB = vertexB;
  loop.halfEdges.push(halfEdge);
  return halfEdge;
}

export function linkSegments(halfEdges) {
  iterateSegments(halfEdges, (prev, next) => {
    prev.next = next;
    next.prev = prev;
  });
}

export function point(x, y, z) {
  return new Point(x, y, z);
}

export function iterateSegments(items, callback) {
  let length = items.length;
  for (let i = 0; i < length; i++) {
    let j = (i + 1) % length;
    callback(items[i], items[j], i, j);
  }
}

export function invertLoop(loop) {
  for (let halfEdge of loop.halfEdges) {
    const t = halfEdge.vertexA;
    halfEdge.vertexA = halfEdge.vertexB;
    halfEdge.vertexB = t;
  }
  loop.halfEdges.reverse();
  linkSegments(loop.halfEdges);
}

export function createPlaneLoop(vertices) {

  const loop = new Loop();

  iterateSegments(vertices, (a, b) => {
    createHalfEdge(loop, a, b)
  });

  linkSegments(loop.halfEdges);
  return loop;
}

function bothClassOf(o1, o2, className) {
  return o1.constructor.name == className && o2.constructor.name == className; 
}

export function createFaceFromTwoEdges(e1, e2) {
  const loop = new Loop();
  e1.loop = loop;
  e2.loop = loop;
  loop.halfEdges.push(
    e1,
    HalfEdge.create(e1.vertexB,  e2.vertexA, loop),
    e2,
    HalfEdge.create(e2.vertexB,  e1.vertexA, loop));
  
  let surface = null;
  if (bothClassOf(e1.edge.curve, e2.edge.curve, 'Line')) {
    const normal = cad_utils.normalOfCCWSeq(loop.halfEdges.map(e => e.vertexA.point));
    surface = createPlaneForLoop(normal, loop);
  } else if (bothClassOf(e1.edge.curve, e2.edge.curve, 'ApproxCurve')) {
    
    const chunk1 = e1.edge.curve.getChunk(e1.vertexA.point, e1.vertexB.point);
    const chunk2 = e2.edge.curve.getChunk(e2.vertexA.point, e2.vertexB.point);
    const n = chunk1.length;
    if (n != chunk2.length) {
      throw 'unsupported';
    }
    const mesh = [];
    for (let p = n - 1, q = 0; q < n; p = q ++) {
      mesh.push([ chunk1[p], chunk1[q], chunk2[q], chunk2[p] ]);
    }
    surface = new ApproxSurface(mesh);
  } else {
    throw 'unsupported';
  }

  linkSegments(loop.halfEdges);
  
  const face = new Face(surface);
  face.outerLoop = loop;
  loop.face = face;
  return face;
}
