import {Shell} from './topo/shell'
import {Vertex} from './topo/vertex'
import {Loop} from './topo/loop'
import {Face} from './topo/face'
import {HalfEdge, Edge} from './topo/edge'
import {Line} from './geom/impl/line'
import {Plane} from './geom/impl/plane'
import {Point} from './geom/point'
import {BasisForPlane, Matrix3} from '../math/l3space'
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
  return new SimpleExtruder(height).extrude(basePoints, cad_utils.normalOfCCWSeq(basePoints));
}

export class Extruder { 
  
  prepareLidCalculation(baseNormal, lidNormal) {
  }
  
  calculateLid(basePoints) {
    throw 'not implemented';
  }
  
  extrude(basePoints, normal) {
    basePoints = checkCCW(basePoints, normal);
    const baseLoop = createPlaneLoop(basePoints.map(p => new Vertex(p)));
    const baseFace = createPlaneFace(normal, baseLoop);
    const lidNormal = normal.multiply(-1);

    this.prepareLidCalculation(normal, lidNormal);

    //iterateSegments(basePoints.map(p => new Vertex(p.plus(offVector))), (a, b) => lidSegments.push({a, b}));
    const lidPoints = this.calculateLid(basePoints, normal, lidNormal).reverse();
    const lidLoop = createPlaneLoop(lidPoints.map(p => new Vertex(p)));
  
    const shell = new Shell();
  
    const n = baseLoop.halfEdges.length;
    for (let i = 0; i < n; i++) {
      let lidIdx = n - 2 - i;
      if (lidIdx == -1) {
        lidIdx = n - 1;
      }
      const baseHalfEdge = baseLoop.halfEdges[i];
      const lidHalfEdge = lidLoop.halfEdges[lidIdx];
      const wallPolygon = [baseHalfEdge.vertexB, baseHalfEdge.vertexA, lidHalfEdge.vertexB, lidHalfEdge.vertexA];
      const wallLoop = createPlaneLoop(wallPolygon);
  
      const baseEdge = new Edge(Line.fromSegment(baseHalfEdge.vertexA.point, baseHalfEdge.vertexB.point));
      linkHalfEdges(baseEdge, baseHalfEdge, wallLoop.halfEdges[0]);
      
      const lidEdge = new Edge(Line.fromSegment(lidHalfEdge.vertexA.point, lidHalfEdge.vertexB.point));
      linkHalfEdges(lidEdge, lidHalfEdge, wallLoop.halfEdges[2]);
  
      const wallNormal = cad_utils.normalOfCCWSeq(wallPolygon.map(v => v.point));
      
      const wallFace = createPlaneFace(wallNormal, wallLoop);
      wallFace.role = 'wall:' + i;
      
      shell.faces.push(wallFace);
    }
    const lidFace = createPlaneFace(lidNormal, lidLoop);
    iterateSegments(shell.faces, (a, b) => {
      const halfEdgeA = a.outerLoop.halfEdges[3];
      const halfEdgeB = b.outerLoop.halfEdges[1];
      const curve = Line.fromSegment(halfEdgeA.vertexA.point, halfEdgeA.vertexB.point);
      linkHalfEdges(new Edge(curve), halfEdgeA, halfEdgeB);
    });
  
    baseFace.role = 'base';
    lidFace.role = 'lid';
    
    shell.faces.push(baseFace, lidFace);
    shell.faces.forEach(f => f.shell = shell);
    return shell;
  }
}

export class SimpleExtruder extends Extruder {
  
  constructor(height) {
    super();
    this.height = height;
  }

  prepareLidCalculation(baseNormal, lidNormal) {
    this.extrudeVector = lidNormal.multiply(this.height);
  }

  calculateLid(basePoints) {
    return basePoints.map(p => p.plus(this.extrudeVector))
  }
}

function createPlaneFace(normal, loop) {
  const w = loop.halfEdges[0].vertexA.point.dot(normal);
  const plane = new Plane(normal, w);
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

export function createPlaneLoop(vertices) {
  
  const loop = new Loop();
  
  iterateSegments(vertices, (a, b) => {
    createHalfEdge(loop, a, b)
  });

  linkSegments(loop.halfEdges);
  return loop;
}

export function createHalfEdge(loop, a, b) {
  const halfEdge = new HalfEdge();
  halfEdge.loop = loop;
  halfEdge.vertexA = a;
  halfEdge.vertexB = b;
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
