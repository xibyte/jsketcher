import {Shell} from './topo/shell'
import {Vertex} from './topo/vertex'
import {Loop} from './topo/loop'
import {Face} from './topo/face'
import {HalfEdge, Edge} from './topo/edge'
import {Line} from './geom/impl/line'
import {Plane} from './geom/impl/plane'
import {Point} from './geom/point'
import * as cad_utils from '../3d/cad-utils'


export function createPrism(basePoints, height) {
  const normal = cad_utils.normalOfCCWSeq(basePoints);
  const baseLoop = createPlaneLoop(basePoints.map(p => new Vertex(p)));
  const baseFace = createPlaneFace(normal, baseLoop);

  const lidNormal = normal.multiply(-1);
  const offVector = lidNormal.multiply(height);
  const lidPoints = basePoints.map(p => p.plus(offVector));
  const lidLoop = createPlaneLoop(lidPoints.map(p => new Vertex(p)));
  const lidFace = createPlaneFace(lidNormal, lidLoop);

  const shell = new Shell();
  
  for (let i = 0; i < baseLoop.halfEdges.length; i++) {
    const baseHalfEdge = baseLoop.halfEdges[i];
    const lidHalfEdge = lidLoop.halfEdges[i];
    const wallLoop = createPlaneLoop([baseHalfEdge.vertexA, baseHalfEdge.vertexB, lidHalfEdge.vertexB, lidHalfEdge.vertexA]);

    const baseEdge = new Edge(new Line());
    linkHalfEdges(baseEdge, baseHalfEdge, wallLoop.halfEdges[0]);
    
    const lidEdge = new Edge(new Line());
    linkHalfEdges(lidEdge, lidHalfEdge, wallLoop.halfEdges[2]);

    const wallNormal = cad_utils.normalOfCCWSeq([baseHalfEdge.vertexA.point, baseHalfEdge.vertexB.point, lidHalfEdge.vertexB.point]);
    
    const wallFace = createPlaneFace(wallNormal, wallLoop);
    wallFace.debugName = 'wall_' + i;
    
    shell.faces.push(wallFace);
  }
  
  iterateSegments(shell.faces, (a, b) => {
    linkHalfEdges(new Edge(new Line()), a.outerLoop.halfEdges[1], b.outerLoop.halfEdges[3]);
  });

  baseFace.debugName = 'base';
  lidFace.debugName = 'lid';
  
  shell.faces.push(baseFace, lidFace);
  return shell;
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
  halfEdge1.vertexA.edges.push(edge);
  halfEdge1.vertexB.edges.push(edge);
}

export function createPlaneLoop(vertices) {
  
  const loop = new Loop();
  
  iterateSegments(vertices, (a, b) => {
    const halfEdge = new HalfEdge();
    halfEdge.loop = loop;
    halfEdge.vertexA = a;
    halfEdge.vertexB = b;
    loop.halfEdges.push(halfEdge);
  });

  linkSegments(loop.halfEdges);
  return loop;
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
