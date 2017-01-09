import * as BREPBuilder from '../brep-builder';
import {HalfEdge, Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Face} from '../topo/face';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import {Line} from '../geom/impl/line';
import Vector from '../../math/vector';

export function union( shell1, shell2 ) {

  
  const facesData = [];
  
  initSolveData(shell1, facesData);
  initSolveData(shell2, facesData);
  
  intersectFaces(shell1, shell2);

  const result = new Shell();
  
  for (let faceData of facesData) {
    
    const seen = new Set();

    while (true) {
      let edge = faceData.edges.pop();
      if (edge == undefined || seen.has(edge)) {
        break;
      }
      const loop = new Loop();
      while (edge) {
        loop.halfEdges.push(edge);
        seen.add(edge);
        let candidates = faceData.vertexToEdge.get(edge.vertexB);
        edge = findMaxTurningLeft(candidates);
        if (seen.has(edge)) {
          break;
        }
      }

      BREPBuilder.linkSegments(loop.halfEdges);
      const newFace = new Face(faceData.face.surface);
      newFace.outerLoop = loop;
      newFace.outerLoop.face = newFace;
      result.push(newFace);
    }
  }
}

function initSolveData(shell, facesData) {
  for (let face of shell.faces) {
    const solveData = new FaceSolveData(face);
    facesData.push(solveData);
    face.__faceSolveData = solveData;
    for (let he of face.outerLoop) {
      EdgeSolveData.clear(he);
      solveData.vertexToEdge.set(he.vertexA, [he]);
    }
  }  
}

function findMaxTurningLeft() {
  
}

function intersectFaces(shell1, shell2) {
  for (let i = 0; i < shell1.faces.length; i++) {
    for (let j = 0; j < shell2.faces.length; j++) {
      const face1 = shell1.faces[i];
      const face2 = shell2.faces[j];
      
      const curve = face1.surface.intersect(face2.surface);

      const newEdges = [];
      const direction = face1.surface.normal.cross(face2.surface.normal);
      split(face2, face1.outerLoop, newEdges, curve, direction);
      split(face1, face2.outerLoop, newEdges, curve, direction);

      newEdges.forEach(e => {
        face1.__faceSolveData.newEdges.push(e.halfEdge1);
        addToListInMap(face1.__faceSolveData.vertexToEdge, e.halfEdge1.vertexA, e.halfEdge1);
      });
      newEdges.forEach(e =>  {
        face2.__faceSolveData.newEdges.push(e.halfEdge2);
        addToListInMap(face2.__faceSolveData.vertexToEdge, e.halfEdge2.vertexA, e.halfEdge2);
      });
    }
  }
}

function split(face, loop, result, onCurve, direction) {
  const nodes = [];
  for (let edge of loop.halfEdges) {
    const edgeSolveData = EdgeSolveData.get(edge);
    if (edgeSolveData.skipFace.has(face)) {
      continue;
    }
    const preExistVertex = edgeSolveData.splitByFace.get(face);
    if (preExistVertex) {
      nodes.push(new Node(preExistVertex, edgeNormal(edge), edge));
      continue
    }
    intersectSurfaceWithEdge(face.surface, edge, nodes);
  }
  for (let i = 0; i < nodes.length; i++) {
    let inNode = nodes[i];
    nodes[i] = null;
    let closestIdx = findCloserProjection(nodes, inNode.point);
    if (closestIdx == -1) {
      throw 'consider me';
    }
    let outNode = nodes[closestIdx];
    
    if (outNode.normal.dot(inNode.normal) > 0) {
      continue;
    }

    nodes[closestIdx] = null;
    
    const halfEdge1 = new HalfEdge();
    halfEdge1.vertexA = inNode.vertex;
    halfEdge1.vertexB = outNode.vertex;
    
    const halfEdge2 = new HalfEdge();
    halfEdge2.vertexB = halfEdge1.vertexA;
    halfEdge2.vertexA = halfEdge1.vertexB;

    splitEdgeByVertex(inNode.edge, halfEdge1.vertexA);
    splitEdgeByVertex(outNode.edge, halfEdge1.vertexB);

    const sameDirection = direction.dot(outNode.point.minus(inNode.point)) > 0;

    const halfEdgeSameDir = sameDirection ? halfEdge1 : halfEdge2;
    const halfEdgeNegativeDir = sameDirection ? halfEdge2 : halfEdge1;

    // cross edge should go with negative dir for the first face and positive for the second
    const edge = new Edge(onCurve);
    edge.halfEdge1 = halfEdgeNegativeDir;
    edge.halfEdge2 = halfEdgeSameDir;
    
    result.push(edge);
  }
}

function splitEdgeByVertex(originHalfEdge, vertex) {
  const halfEdge1 = new HalfEdge();
  halfEdge1.vertexA = vertex;
  halfEdge1.vertexB = originHalfEdge.vertexB;

  const halfEdge2 = new HalfEdge();
  halfEdge2.vertexA = halfEdge1.vertexB;
  halfEdge2.vertexB = halfEdge1.vertexA;

  const newEdge = new Edge(originHalfEdge.edge);
  BREPBuilder.linkHalfEdges(newEdge, halfEdge1, halfEdge2);

  const twin = originHalfEdge.twin();
  originHalfEdge.vertexB = vertex;
  twin.vertexA = vertex;
  
  originHalfEdge.loop.push(halfEdge1);
  twin.loop.push(halfEdge2);

  halfEdge1.loop = originHalfEdge.loop;
  halfEdge2.loop = twin.loop;

  EdgeSolveData.transfer(originHalfEdge, halfEdge1);
  EdgeSolveData.transfer(twin, halfEdge2);

  EdgeSolveData.createIfEmpty(twin).splitByFace.set(originHalfEdge.loop.face, vertex);
  EdgeSolveData.createIfEmpty(halfEdge2).skipFace.add(originHalfEdge.loop.face);

  //addToListInMap(originHalfEdge.loop.face.__faceSolveData.vertexToEdge, 
}

function findCloserProjection(nodes, point) {
  let hero = -1;
  let heroDistance = Number.MAX_VALUE;
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node == null)
    let projectionDistance = node.normal.dot(node.point.minus(point));
    if (hero == -1 || (projectionDistance > 0 && projectionDistance < heroDistance)) {
      hero = i;
      heroDistance = projectionDistance;
    }
  }
  return hero;
}

function intersectSurfaceWithEdge(surface, edge, result) {
  const p0 = edge.vertexA.point;
  const ab = edge.vertexB.point.minus(p0);
  const length = ab.length();
  const v = ab._multiply(1 / length);
  const edgeLine = new Line(p0, v);
  const t = edgeLine.intersectSurface(surface);
  if (t >= 0 && t <= length) {
    const pointOfIntersection = edgeLine.parametricEquation(t);
    const edgeNormal = edge.loop.face.surface.normal.cross(v)._normalize() ;
    result.push(new Node(new Vertex(pointOfIntersection), edgeNormal, edge));
  }
}

function edgeNormal(edge) {
  return edge.loop.face.surface.normal.cross( edge.vertexB.point.minus(edge.vertexA.point) )._normalize();
}

function intersectCurveWithEdge(curve, edge, surface, result) {
  const p0 = edge.vertexA.point;
  const ab = edge.vertexB.point.minus(p0);
  const length = ab.length();
  const v = ab._multiply(1 / length);
  const edgeLine = new Line(p0, v);
  const t = edgeLine.intersectCurve(curve, surface);
  if (t >= 0 && t <= length) {
    const pointOfIntersection = edgeLine.parametricEquation(t);
    const edgeNormal = surface.normal.cross(v)._normalize() ;
    result.push(new Node(pointOfIntersection, edgeNormal, edge));
  }
}

function EdgeSolveData() {
  this.splitByFace = new Map();
  this.skipFace = new Set();
}

EdgeSolveData.EMPTY = new EdgeSolveData();

EdgeSolveData.get = function(edge) {
  if (!edge.__edgeSolveData) {
    return EdgeSolveData.EMPTY;
  }
  return edge.__edgeSolveData;
};

EdgeSolveData.createIfEmpty = function(edge) {
  if (!edge.__edgeSolveData) {
    edge.__edgeSolveData = new EdgeSolveData();
  }
  return edge.__edgeSolveData;
};

EdgeSolveData.clear = function(edge) {
  delete edge.__edgeSolveData;
};

EdgeSolveData.transfer = function(from, to) {
  to.__edgeSolveData = from.__edgeSolveData;
};

function Node(vertex, normal, splitsEdge) {
  this.vertex = vertex;
  this.normal = normal;
  this.point = vertex.point;
}

class SolveData {
  constructor() {
    this.faceData = [];
  }
}

class FaceSolveData {
  constructor(face) {
    this.face = face;
    this.newEdges = [];
    this.newChunks = [];
    this.vertexToEdge = new Map();
  }
}

function addToListInMap(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.add(value);
}
