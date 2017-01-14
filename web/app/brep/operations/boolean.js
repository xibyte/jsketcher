import * as BREPBuilder from '../brep-builder';
import {BREPValidator} from '../brep-validator';
import {HalfEdge, Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Face} from '../topo/face';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import {Line} from '../geom/impl/line';
import Vector from '../../math/vector';
import * as math from '../../math/math';

export const TOLERANCE = 1e-8;

const TYPE = {
  UNION: 0,
  INTERSECT: 1,
  SUBTRACT: 2
};

export function union( shell1, shell2 ) {
  return BooleanAlgorithm(shell1, shell2, TYPE.UNION);
}

export function intersect( shell1, shell2 ) {
  return BooleanAlgorithm(shell1, shell2, TYPE.INTERSECT);
}

export function subtract( shell1, shell2 ) {
  invert(shell2);
  return BooleanAlgorithm(shell1, shell2, TYPE.SUBTRACT);
}

export function invert( shell ) {
  for (let face of shell.faces) {
    face.surface = face.surface.invert();
    invertLoop(face.outerLoop);
  }
  BREPValidator.validateToConsole(shell);
}

function invertLoop(loop) {
  for (let halfEdge of loop.halfEdges) {
    const t = halfEdge.vertexA;
    halfEdge.vertexA = halfEdge.vertexB;
    halfEdge.vertexB = t;
  }
  loop.halfEdges.reverse();
  BREPBuilder.linkSegments(loop.halfEdges);
}

export function BooleanAlgorithm( shell1, shell2, type ) {

  const facesData = [];
  
  initSolveData(shell1, facesData);
  initSolveData(shell2, facesData);
  
  intersectFaces(shell1, shell2, type !== TYPE.UNION);

  const allFaces = [];
  //__DEBUG__.AddSegment(shell2.faces[0].outerLoop.halfEdges[0].vertexA.point, shell2.faces[0].outerLoop.halfEdges[0].vertexB.point)
  const newLoops = new Set();
  for (let faceData of facesData) {
    const face = faceData.face;
    const loops = [];
    const seen = new Set();
    const edges = [];
    for (let e of face.edges) edges.push(e);
    faceData.newEdges.forEach(e => edges.push(e));
    while (true) {
      let edge = edges.pop();
      if (!edge) {
        break;
      }
      if (seen.has(edge)) {
        continue;
      }
      const loop = new Loop();
      while (edge) {
        //__DEBUG__.AddHalfEdge(edge);
        const isNew = faceData.newEdges.indexOf(edge) != -1;
        if (isNew) newLoops.add(loop);
        
        loop.halfEdges.push(edge);
        seen.add(edge);
        let candidates = faceData.vertexToEdge.get(edge.vertexB);
        if (!candidates) {
          break;
        }
        edge = findMaxTurningLeft(edge, candidates);
        if (seen.has(edge)) {
          break;
        }
      }

      if (loop.halfEdges[0].vertexA == loop.halfEdges[loop.halfEdges.length - 1].vertexB) {
        for (let halfEdge of loop.halfEdges) {
          halfEdge.loop = loop;
        }
        
        BREPBuilder.linkSegments(loop.halfEdges);
        loops.push(loop);
      }
    }
    loopsToFaces(face, loops, allFaces);
  }
  const result = new Shell();
  const faces = filterFaces(allFaces, newLoops);
  faces.forEach(face => {
    face.shell = result;
    result.faces.push(face);
  });

  BREPValidator.validateToConsole(result);
  return result;
}

function filterFaces(faces, newLoops, validLoops) {
  const validFaces = new Set(faces);
  const result = new Set();
  for (let face of faces) {
    traverseFaces(face, validFaces, (it) => {
      if (result.has(it) || isFaceContainNewLoop(it, newLoops)) {
        result.add(face);
        return true;
      }
    });
  }
  return result;
}

function isFaceContainNewLoop(face, newLoops) {
  for (let loop of face.loops) {
    if (newLoops.has(loop)) {
      return true;
    }
  }
  return false;
}

function traverseFaces(face, validFaces, callback) {
  const stack = [face];
  const seen = new Set();
  while (stack.length !== 0) {
    face = stack.pop();
    if (seen.has(face)) continue;
    seen.add(face);
    if (callback(face) === true) {
      return;
    }
    for (let loop of face.loops) {
      if (!validFaces.has(face)) continue;
      for (let halfEdge of loop.halfEdges) {
        const twin = halfEdge.twin();
        if (validFaces.has(twin.loop.face)) {
          stack.push(twin.loop.face)
        }
      }
    }
  }
}

function loopsToFaces(originFace, loops, out) {
  function createFaces(nestedLoop) {
    const loop = nestedLoop.loop;
    const newFace = new Face(originFace.surface);
    newFace.outerLoop = loop;
    loop.face = newFace;
    out.push(newFace);
    for (let child of nestedLoop.nesting) {
      if (child.loop.isCCW(originFace.surface)) {
        createFaces(child);
      } else {
        child.loop.face = newFace;
        newFace.innerLoops.push(child.loop);
      }
    }
  }
  const nestedLoops = getNestedLoops(originFace, loops);
  //loops.forEach(l => l.halfEdges.forEach(h => __DEBUG__.AddHalfEdge(h)))
  for (let nestedLoop of nestedLoops) {
    if (nestedLoop.loop.isCCW(originFace.surface)) {
      createFaces(nestedLoop);
    }
  }
}

function getNestedLoops(face, brepLoops) {
  const tr = face.surface.get2DTransformation();
  function NestedLoop(polygon, loop) {
    this.polygon = polygon;
    this.loop = loop;
    this.nesting = [];
    this.level = 0;
  }

  const loops = brepLoops.map(loop => {
    const polygon = loop.asPolygon().map(point => tr.apply(point));
    return new NestedLoop(polygon, loop);
  });
  function contains(polygon, other) {
    for (let point of other) {
      if (!math.isPointInsidePolygon(point, polygon)) {
        return false;
      }
    }
    return true;
  }
  for (let i = 0; i < loops.length; ++i) {
    const loop = loops[i];
    for (let j = 0; j < loops.length; ++j) {
      if (i == j) continue;
      const other = loops[j];
      if (contains(loop.polygon, other.polygon)) {
        loop.nesting.push(other);
        other.level ++;
      }
    }
  }
  return loops.filter(l => l.level == 0);
}


function initSolveData(shell, facesData) {
  for (let face of shell.faces) {
    const solveData = new FaceSolveData(face);
    facesData.push(solveData);
    face.__faceSolveData = solveData;
    for (let he of face.edges) {
      EdgeSolveData.clear(he);
      solveData.vertexToEdge.set(he.vertexA, [he]);
    }
  }  
}

function findMaxTurningLeft(edge, edges) {
  edges = edges.slice();
  function edgeVector(edge) {
    return edge.vertexB.point.minus(edge.vertexA.point)._normalize();
  }
  const edgeV = edgeVector(edge);
  function leftTurningMeasure(v1, v2) {
    let measure = v1.dot(v2);
    if (v1.cross(v1) < 0) {
      measure *= -1;
      measure += 2;
    }
    return measure 
  }
  edges.sort((e1, e2) => {
    return leftTurningMeasure(edgeV, edgeVector(e1)) - leftTurningMeasure(edgeV, edgeVector(e2));
  });
  return edges[0];
}

function intersectFaces(shell1, shell2, inverseCrossEdgeDirection) {
  for (let i = 0; i < shell1.faces.length; i++) {
    for (let j = 0; j < shell2.faces.length; j++) {
      const face1 = shell1.faces[i];
      const face2 = shell2.faces[j];

      const curve = face1.surface.intersect(face2.surface);
  
      const nodes = [];
      collectNodesOfIntersectionOfFace(face2, face1, nodes);
      collectNodesOfIntersectionOfFace(face1, face2, nodes);

      const newEdges = [];
      const direction = face1.surface.normal.cross(face2.surface.normal);
      if (inverseCrossEdgeDirection) {
        direction._multiply(-1);
      }
      split(nodes, newEdges, curve, direction);

      newEdges.forEach(e => {
         //__DEBUG__.AddHalfEdge(e.halfEdge1);
        face1.__faceSolveData.newEdges.push(e.halfEdge1);
        face2.__faceSolveData.newEdges.push(e.halfEdge2);
        
        addToListInMap(face1.__faceSolveData.vertexToEdge, e.halfEdge1.vertexA, e.halfEdge1);
        addToListInMap(face2.__faceSolveData.vertexToEdge, e.halfEdge2.vertexA, e.halfEdge2);
      });
    }
  }
}

function collectNodesOfIntersectionOfFace(splittingFace, face, nodes) {
  for (let loop of face.loops) {
    collectNodesOfIntersection(splittingFace, loop, nodes);
  }
}

function collectNodesOfIntersection(face, loop, nodes) {
  const verticesCases = new Set();
  for (let edge of loop.halfEdges) {
    const edgeSolveData = EdgeSolveData.get(edge);
    if (edgeSolveData.skipFace.has(face)) {
      continue;
    }
    const preExistVertex = edgeSolveData.splitByFace.get(face);
    if (preExistVertex) {
      __DEBUG__.AddVertex(preExistVertex);
      nodes.push(new Node(preExistVertex, edgeNormal(edge), edge, face));
      continue
    }
    intersectFaceWithEdge(face, edge, nodes, verticesCases);
  }
}

function split(nodes, result, onCurve, direction) {
  for (let i = 0; i < nodes.length; i++) {
    let inNode = nodes[i];
    //if (i == 0)  __DEBUG__.AddPoint(inNode.vertex.point);

    if (inNode == null) continue;
    nodes[i] = null;
    let closestIdx = findCloserProjection(nodes, inNode);
    if (closestIdx == -1) {
      continue;
    }
    let outNode = nodes[closestIdx];
    //if (i == 1)  __DEBUG__.AddPoint(outNode.vertex.point);
    //if (i == 1)  __DEBUG__.AddSegment(inNode.point, inNode.point.plus(inNode.normal.multiply(1000)));
    //__DEBUG__.AddSegment(new Vector(),  outNode.normal.multiply(100));

    if (outNode.normal.dot(inNode.normal) > 0) {
      continue;
    }

    nodes[closestIdx] = null;

    //__DEBUG__.AddPoint(inNode.vertex.point);
    //__DEBUG__.AddPoint(outNode.vertex.point);


    const halfEdge1 = new HalfEdge();
    halfEdge1.vertexA = inNode.vertex;
    halfEdge1.vertexB = outNode.vertex;
    
    const halfEdge2 = new HalfEdge();
    halfEdge2.vertexB = halfEdge1.vertexA;
    halfEdge2.vertexA = halfEdge1.vertexB;

    //__DEBUG__.AddHalfEdge(halfEdge1);
    //__DEBUG__.AddSegment(new Vector(),  direction.multiply(100));


    splitEdgeByVertex(inNode.edge, halfEdge1.vertexA, inNode.splittingFace);
    splitEdgeByVertex(outNode.edge, halfEdge1.vertexB, outNode.splittingFace);

    const sameDirection = direction.dot(outNode.point.minus(inNode.point)) > 0;

    const halfEdgeSameDir = sameDirection ? halfEdge1 : halfEdge2;
    const halfEdgeNegativeDir = sameDirection ? halfEdge2 : halfEdge1;

    // cross edge should go with negative dir for the first face and positive for the second
    const edge = new Edge(onCurve);
    edge.halfEdge1 = halfEdgeNegativeDir;
    edge.halfEdge2 = halfEdgeSameDir;
    halfEdgeNegativeDir.edge = edge;
    halfEdgeSameDir.edge = edge;
    
    result.push(edge);
  }
}

function splitEdgeByVertex(originHalfEdge, vertex, splittingFace) {
  
  function splitHalfEdge(h) {
    const newEdge = new HalfEdge();
    newEdge.vertexA = vertex;
    newEdge.vertexB = h.vertexB;
    h.vertexB = newEdge.vertexA;
    addToListInMap(h.loop.face.__faceSolveData.vertexToEdge, vertex, newEdge);
    return newEdge;
  }

  const orig = originHalfEdge;
  const twin = orig.twin();

  if (orig.vertexA == vertex || orig.vertexB == vertex) {
    return;
  }
  
  const newOrig = splitHalfEdge(orig);
  const newTwin = splitHalfEdge(twin);


  BREPBuilder.linkHalfEdges(orig.edge, orig, newTwin);
  BREPBuilder.linkHalfEdges(new Edge(orig.edge.curve), twin, newOrig);
  
  orig.loop.halfEdges.splice(orig.loop.halfEdges.indexOf(orig) + 1, 0, newOrig);
  twin.loop.halfEdges.splice(twin.loop.halfEdges.indexOf(twin) + 1, 0, newTwin);

  newOrig.loop = orig.loop;
  newTwin.loop = twin.loop;
  
  EdgeSolveData.transfer(orig, newOrig);
  EdgeSolveData.transfer(twin, newTwin);

  EdgeSolveData.createIfEmpty(twin).splitByFace.set(splittingFace, vertex);
  EdgeSolveData.createIfEmpty(newTwin).skipFace.add(splittingFace);
}

function findCloserProjection(nodes, toNode) {
  let hero = -1;
  let heroDistance = Number.MAX_VALUE;
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node == null) continue;
    let projectionDistance = toNode.normal.dot(node.point.minus(toNode.point));
    if (projectionDistance > 0 && projectionDistance < heroDistance) {
      hero = i;
      heroDistance = projectionDistance;
    }
  }
  return hero;
}

function intersectFaceWithEdge(face, edge, result, vertecies) {

  if (vertecies.has(edge.vertexA) || vertecies.has(edge.vertexB)) {
    return;
  }

  const p0 = edge.vertexA.point;
  const ab = edge.vertexB.point.minus(p0);
  const length = ab.length();
  const v = ab._multiply(1 / length);
  const edgeLine = new Line(p0, v);
  const t = edgeLine.intersectSurface(face.surface);
  if (t >= 0 && t <= length) {
    const pointOfIntersection = edgeLine.parametricEquation(t);
    //TODO: should check if point on an edge then exclude that edge from further intersection test cuz it would produce two identical Nodes
    //TODO: should check if point on a vertex then exclude two edges of the vertex from further intersection test cuz it would produce three identical Nodes
    if (pointBelongsToFace(pointOfIntersection, face)) {
      let vertexOfIntersection;
      if (math.areVectorsEqual(edge.vertexA.point, pointOfIntersection, TOLERANCE)) {
        vertecies.add(edge.vertexA);
        vertexOfIntersection = edge.vertexA;
        //console.log("point A on surface");
      } if (math.areVectorsEqual(edge.vertexB.point, pointOfIntersection, TOLERANCE)) {
        vertecies.add(edge.vertexB);
        vertexOfIntersection = edge.vertexB;
        //console.log("point B on surface");
      } else {
        vertexOfIntersection = new Vertex(pointOfIntersection);
        duplicatePointTest(pointOfIntersection);
      }

      const edgeNormal = edge.loop.face.surface.normal.cross(v)._normalize() ;
      result.push(new Node(vertexOfIntersection, edgeNormal, edge));
      
    }
  }
}

function pointBelongsToFace(point, face) {
  const tr = face.surface.get2DTransformation();
  if (pointInsideLoop(point, face.outerLoop, tr)) {
    for (let innerLoop of face.innerLoops) {
      if (pointInsideLoop(point, innerLoop, tr)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function pointInsideLoop(point, loop, tr) {
  const polygon = loop.asPolygon().map(p => tr.apply(p));
  const point2d = tr.apply(point);
  return pointInsidePolygon(point2d, polygon);
}

function pointInsidePolygon(point, polygon) {
  //TODO: absolutely unacceptable way. should be done honoring intersecting edges and vertices. see TODOs above
  return math.isPointInsidePolygon(point, polygon);
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

function Node(vertex, normal, splitsEdge, splittingFace) {
  this.vertex = vertex;
  this.normal = normal;
  this.point = vertex.point;
  this.edge = splitsEdge;
  this.splittingFace = splittingFace;
  __DEBUG__.AddPoint(this.point);
}


let __DEBUG_POINT_DUPS = [];
function duplicatePointTest(point, data) {
  data = data || {};
  let res = false;
  for (let entry of __DEBUG_POINT_DUPS) {
    let other = entry[0];
    if (math.areVectorsEqual(point, other, TOLERANCE)) {
      res = true;
      break;
    }
  }
  __DEBUG_POINT_DUPS.push([point, data]);
  if (res) {
    __DEBUG__.Clear();
    __DEBUG__.AddPoint(point);
    console.error('DUPLICATE DETECTED: ' + point)
  }
  return res;
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
    this.vertexToEdge = new Map();
  }
}

function addToListInMap(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

let xxx = 0;
