import {BREPValidator} from '../brep-validator';
import {Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Face} from '../topo/face';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import Vector from '../../math/vector';
import * as math from '../../math/math';

export const TOLERANCE = 1e-8;
 export const TOLERANCE_SQ = TOLERANCE * TOLERANCE;
export const TOLERANCE_HALF = TOLERANCE * 0.5;

const DEBUG = {
  OPERANDS_MODE: false,
  LOOP_DETECTION: true,
  FACE_FACE_INTERSECTION: true,
  NOOP: () => {}
};

const TYPE = {
  UNION: 'UNION',
  INTERSECT: 'INTERSECT'
};

export function union( shell1, shell2 ) {
  $DEBUG_OPERANDS(shell1, shell2);
  return BooleanAlgorithm(shell1, shell2, TYPE.UNION);
}

export function intersect( shell1, shell2 ) {
  $DEBUG_OPERANDS(shell1, shell2);
  return BooleanAlgorithm(shell1, shell2, TYPE.INTERSECT);
}

export function subtract( shell1, shell2 ) {
  $DEBUG_OPERANDS(shell1, shell2);
  invert(shell2);
  return BooleanAlgorithm(shell1, shell2, TYPE.INTERSECT);
}

export function invert( shell ) {
  for (let face of shell.faces) {
    face.surface = face.surface.invert();
    for (let edge of shell.edges) {
      edge.invert();
    }
    for (let loop of face.loops) {
      for (let i = 0; i < loop.halfEdges.length; i++) {
        loop.halfEdges[i] = loop.halfEdges[i].twin();
      }
      loop.halfEdges.reverse();
      loop.link();
    }
  }
  BREPValidator.validateToConsole(shell);
}

export function BooleanAlgorithm( shell1, shell2, type ) {

  let facesData = [];

  mergeVertices(shell1, shell2);
  initVertexFactory(shell1, shell2)

  intersectEdges(shell1, shell2);

  initSolveData(shell1, facesData);
  initSolveData(shell2, facesData);

  intersectFaces(shell1, shell2, type);

  for (let faceData of facesData) {
    faceData.initGraph();
  }

  const allFaces = [];
  const newLoops = new Set();
  for (let faceData of facesData) {
    const face = faceData.face;
    const loops = detectLoops(faceData.face);
    for (let loop of loops) {
      for (let edge of loop.halfEdges) {
        if (isNew(edge)) newLoops.add(loop);
      }
    }
    loopsToFaces(face, loops, allFaces);
  }
  let faces = allFaces;
  faces = filterFaces(faces, newLoops);
  const result = new Shell();
  faces.forEach(face => {
    face.shell = result;
    result.faces.push(face);
  });

  cleanUpSolveData(result);
  BREPValidator.validateToConsole(result);

  __DEBUG__.ClearVolumes();
  // __DEBUG__.Clear();
  return result;
}

function detectLoops(face) {
  const faceData = face.data[MY];
  if (DEBUG.LOOP_DETECTION) {
    __DEBUG__.Clear();
    __DEBUG__.AddFace(face, 0x00ff00);
    DEBUG.NOOP();
  }

  const loops = [];
  const seen = new Set();
  let edges = [];
  for (let e of face.edges) {
    edges.push(e);
  }
  while (true) {
    let edge = edges.pop();
    if (!edge) {
      break;
    }
    if (seen.has(edge)) {
      continue;
    }
    const loop = new Loop(null);
    let surface = face.surface;
    while (edge) {
      if (DEBUG.LOOP_DETECTION) {
        __DEBUG__.AddHalfEdge(edge);
      }
      loop.halfEdges.push(edge);
      seen.add(edge);
      let candidates = faceData.vertexToEdge.get(edge.vertexB);
      if (!candidates) {
        break;
      }
      edge = findMaxTurningLeft(edge, candidates, surface);
      if (seen.has(edge)) {
        break;
      }
    }

    if (loop.halfEdges[0].vertexA === loop.halfEdges[loop.halfEdges.length - 1].vertexB) {
      loop.link();
      loops.push(loop);
    }
  }
  return loops;
}

export function mergeVertices(shell1, shell2) {
  const toSwap = new Map();
  for (let v1 of shell1.vertices) {
    for (let v2 of shell2.vertices) {
      if (veq(v1.point, v2.point)) {
        toSwap.set(v2, v1);
      }
    }
  }

  for (let face of shell2.faces) {
    for (let h of face.edges) {
      const aSwap = toSwap.get(h.vertexA);
      const bSwap = toSwap.get(h.vertexB);
      if (aSwap) {
        h.vertexA = aSwap;
      }
      if (bSwap) {
        h.vertexB = bSwap;
      }
    }
  }
}

function filterFaces(faces, newLoops) {
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

export function loopsToFaces(originFace, loops, out) {
  const face = new Face(originFace.surface);
  face.innerLoops = loops;
  loops.forEach(loop => loop.face = face);
  out.push(face);
}


function initSolveData(shell, facesData) {
  for (let face of shell.faces) {
    const solveData = new FaceSolveData(face);
    facesData.push(solveData);
    face.data[MY] = solveData;
    for (let he of face.edges) {
      EdgeSolveData.clear(he);
    }
  }
}

function cleanUpSolveData(shell) {
  for (let face of shell.faces) {
    delete face.data[MY];
    for (let he of face.edges) {
      EdgeSolveData.clear(he);
    }
  }
}

function findMaxTurningLeft(pivotEdge, edges, surface) {
  edges = edges.slice();
  function edgeVector(edge) {
    return edge.tangent(edge.vertexA.point);
  }
  const pivot = pivotEdge.tangent(pivotEdge.vertexB.point);
  const normal = surface.normal(pivotEdge.vertexB.point);
  edges.sort((e1, e2) => {
    return leftTurningMeasure(pivot, edgeVector(e1), normal) - leftTurningMeasure(pivot, edgeVector(e2), normal);
  });
  return edges[edges.length - 1];
}

function leftTurningMeasure(v1, v2, normal) {
  let measure = v1.dot(v2);
  if (v1.cross(v2).dot(normal) < 0) {
    measure = -(2 + measure);
  }
  measure -= 1;//shift to the zero

  //make it positive all the way
  return -measure;
}

function intersectEdges(shell1, shell2) {
  function collectTuples(shell) {
    const tuples = [];
    for (let edge of shell.edges) {
      tuples.push([edge]);
    }
    return tuples;
  }

  const tuples1 = collectTuples(shell1);
  const tuples2 = collectTuples(shell2);

  for (let i = 0; i < tuples1.length; i++) {
    const edges1 = tuples1[i];
    for (let j = 0; j < tuples2.length; j++) {
      const edges2 = tuples2[j];
      for (let k = 0; k < edges1.length; k++) {
        const e1 = edges1[k];
        for (let l = edges2.length - 1; l >= 0 ; l--) {
          const e2 = edges2[l];
          let points = e1.curve.intersectCurve(e2.curve, TOLERANCE);

          for (let point of points) {
            const {u0, u1} = point;
            let vertex;
            if (eq(u0, 0)) {
              vertex = e1.halfEdge1.vertexA;
            } else if (eq(u0, 1)) {
              vertex = e1.halfEdge1.vertexB;
            } else if (eq(u1, 0)) {
              vertex = e2.halfEdge1.vertexA;
            } else if (eq(u1, 1)) {
              vertex = e2.halfEdge1.vertexB;
            } else {
              vertex = vertexFactory.create(e1.curve.point(u0));
            }
            const new1 = splitEdgeByVertex(e1, vertex);
            const new2 = splitEdgeByVertex(e2, vertex);
            if (new1 !== null) {
              edges1[k] = new1[0];
              edges1.push(new1[1]);
            }
            if (new2 !== null) {
              edges2[l] = new2[0];
              edges2.push(new2[1]);
            }
          }
        }
      }
    }
  }
}


function fixCurveDirection(curve, surface1, surface2, operationType) {
  let point = curve.point(0.5);
  let tangent = curve.tangentAtPoint(point);
  let normal1 = surface1.normal(point);
  let normal2 = surface2.normal(point);

  let expectedDirection = normal1.cross(normal2);

  if (operationType === TYPE.UNION) {
    expectedDirection._negate();
  }
  let sameAsExpected = expectedDirection.dot(tangent) > 0;
  if (!sameAsExpected) {
    curve = curve.invert();
  }
  return curve;
}

//TODO: extract to a unit test
function newEdgeDirectionValidityTest(e, curve) {
  let point = e.halfEdge1.vertexA.point;
  let tangent = curve.tangentAtPoint(point);
  assert('tangent of originated curve and first halfEdge should be the same', math.vectorsEqual(tangent, e.halfEdge1.tangent(point)));
  assert('tangent of originated curve and second halfEdge should be the opposite', math.vectorsEqual(tangent._negate(), e.halfEdge2.tangent(point)));
}

function intersectFaces(shell1, shell2, operationType) {
  const invert = operationType === TYPE.UNION;
  for (let i = 0; i < shell1.faces.length; i++) {
    const face1 = shell1.faces[i];
    if (DEBUG.FACE_FACE_INTERSECTION) {
      __DEBUG__.Clear(); 
      __DEBUG__.AddFace(face1, 0x00ff00);
      DEBUG.NOOP();
    }
    for (let j = 0; j < shell2.faces.length; j++) {
      const face2 = shell2.faces[j];
      if (DEBUG.FACE_FACE_INTERSECTION) {
        __DEBUG__.Clear();
        __DEBUG__.AddFace(face1, 0x00ff00);
        __DEBUG__.AddFace(face2, 0x0000ff);
        if (face1.refId === 0 && face2.refId === 0) {
          DEBUG.NOOP();
        }
      }

      let curves = face1.surface.intersectSurface(face2.surface, TOLERANCE);

      for (let curve of curves) {
        curve = fixCurveDirection(curve, face1.surface, face2.surface, operationType);
        const nodes = [];
        collectNodesOfIntersectionOfFace(curve, face1, nodes);
        collectNodesOfIntersectionOfFace(curve, face2, nodes);

        const newEdges = [];
        nullifyDegradedNodes(nodes);
        filterNodes(nodes);
        split(nodes, curve, newEdges);

        newEdges.forEach(e => {
          newEdgeDirectionValidityTest(e, curve);
          addNewEdge(face1, e.halfEdge1);
          addNewEdge(face2, e.halfEdge2);
        });
      }
    }
  }
}

function addNewEdge(face, halfEdge) {
  const data = face.data[MY];
  data.loopOfNew.halfEdges.push(halfEdge);
  halfEdge.loop = data.loopOfNew;
  EdgeSolveData.createIfEmpty(halfEdge).newEdgeFlag = true;
  //addToListInMap(data.vertexToEdge, halfEdge.vertexA, halfEdge);
  return true;
}

function nullifyDegradedNodes(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n !== null) {
      if (n.normal === 0) {
        nodes[i] = null;
      }
    }
  }
}

function filterNodes(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const node1 = nodes[i];
    if (node1 === null) continue;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const node2 = nodes[j];
      if (node2 !== null) {
        if (eq(node2.u, node1.u)) {
          if (node1.normal + node2.normal === 0) {
            nodes[i] = null
          }
          nodes[j] = null
        }
      }
    }
  }
}

function collectNodesOfIntersectionOfFace(curve, face, nodes) {
  for (let loop of face.loops) {
    collectNodesOfIntersection(curve, loop, nodes);
  }
}

function collectNodesOfIntersection(curve, loop, nodes) {
  for (let edge of loop.halfEdges) {
    intersectCurveWithEdge(curve, edge, nodes);
  }
}

function intersectCurveWithEdge(curve, edge, result) {
  __DEBUG__.AddCurve(curve, 0xffffff);
  __DEBUG__.AddHalfEdge(edge, 0xff00ff);
  const points = edge.edge.curve.intersectCurve(curve, TOLERANCE);
  for (let point of points) {
    const {u0, u1} = point;

    let vertex;
    if (eq(u0, 0)) {
      vertex = edge.edge.halfEdge1.vertexA;
    } else if (eq(u0, 1)) {
      vertex = edge.edge.halfEdge1.vertexB;
    } else {
      vertex = vertexFactory.create(point.p0);
    }

    __DEBUG__.AddVertex(vertex);

    result.push(new Node(vertex, edge, curve, u1));
  }
}

function split(nodes, curve, result) {
  nodes = nodes.filter(n => n !== null);
  nodes.sort((n1, n2) => n1.u - n2.u);
  for (let i = 0; i < nodes.length - 1; i++) {
    let inNode = nodes[i];
    let outNode = nodes[i + 1];
    if (inNode.normal * outNode.normal !== -1) {
      continue
    }

    const edge = new Edge(curve, inNode.vertex, outNode.vertex);

    splitEdgeByVertex(inNode.edge.edge, edge.halfEdge1.vertexA);
    splitEdgeByVertex(outNode.edge.edge, edge.halfEdge1.vertexB);

    result.push(edge);
  }
}

function splitEdgeByVertex(edge, vertex) {

  if (edge.halfEdge1.vertexA === vertex || edge.halfEdge1.vertexB === vertex) {
    return null;
  }

  const curves = edge.curve.split(vertex.point);
  const edge1 = new Edge(curves[0], edge.halfEdge1.vertexA, vertex);
  const edge2 = new Edge(curves[1], vertex, edge.halfEdge1.vertexB);

  function updateInLoop(halfEdge, h1, h2) {
    let halfEdges = halfEdge.loop.halfEdges;
    halfEdges.splice(halfEdges.indexOf(halfEdge), 1, h1, h2);
    h1.loop = halfEdge.loop;
    h2.loop = halfEdge.loop;
  }
  updateInLoop(edge.halfEdge1, edge1.halfEdge1, edge2.halfEdge1);
  updateInLoop(edge.halfEdge2, edge2.halfEdge2, edge1.halfEdge2);

  EdgeSolveData.transfer(edge.halfEdge1, edge1.halfEdge1);
  EdgeSolveData.transfer(edge.halfEdge1, edge2.halfEdge1);

  EdgeSolveData.transfer(edge.halfEdge2, edge2.halfEdge2);
  EdgeSolveData.transfer(edge.halfEdge2, edge1.halfEdge2);

  return [edge1, edge2];
}

function nodeNormal(point, edge, curve) {
  const normal = edge.loop.face.surface.normal(point);
  const edgeTangent = edge.tangent(point);
  const curveTangent = curve.tangentAtPoint(point);

  let cross = normal.cross(edgeTangent);
  let dot = cross.dot(curveTangent);
  if (eq(dot, 0)) {
    dot = 0;
  } else {
    if (dot < 0) 
      dot = -1;
    else 
      dot = 1;
  }
  return dot;
}

function EdgeSolveData() {
}

EdgeSolveData.EMPTY = new EdgeSolveData();

EdgeSolveData.get = function(edge) {
  if (!edge.data[MY]) {
    return EdgeSolveData.EMPTY;
  }
  return edge.data[MY];
};

EdgeSolveData.createIfEmpty = function(edge) {
  if (!edge.data[MY]) {
    edge.data[MY] = new EdgeSolveData();
  }
  return edge.data[MY];
};

EdgeSolveData.clear = function(edge) {
  delete edge.data[MY];
};

EdgeSolveData.transfer = function(from, to) {
  to.data[MY] = from.data[MY];
};

function isNew(edge) {
  return EdgeSolveData.get(edge).newEdgeFlag === true
}

function Node(vertex, edge, curve, u) {
  this.vertex = vertex;
  this.edge = edge;
  this.curve = curve;
  this.u = u;
  this.normal = isNew(edge) ? 0 : nodeNormal(vertex.point, edge, curve);
  //__DEBUG__.AddPoint(this.point);
}


let vertexFactory = null;
function initVertexFactory(shell1, shell2) {
  vertexFactory = new VertexFactory();
  vertexFactory.addVertices(shell1.vertices);
  vertexFactory.addVertices(shell2.vertices);
}

class VertexFactory {

  constructor() {
    this.vertices = [];
  }

  addVertices(vertices) {  
    for (let v of vertices) {
      this.vertices.push(v);
    }
  }

  find(point) {
    for (let vertex of this.vertices) {
      if (veq(point, vertex.point)) {
        return vertex;
      }
    }
    return null;  
  }

  create(point) {
    
    let vertex = this.find(point);
    if (vertex === null) {
      vertex = new Vertex(point);
      this.vertices.push(vertex);
      console.log("DUPLICATE DETECTED: " + vertex);
    }
    return vertex;
  }
}

class SolveData {
  constructor() {
    this.faceData = [];
  }
}

class FaceSolveData {
  constructor(face) {
    this.face = face;
    this.loopOfNew = new Loop(face);
    face.innerLoops.push(this.loopOfNew);
    this.vertexToEdge = new Map();
  }

  initGraph() {
    this.vertexToEdge.clear();
    for (let he of this.face.edges) {
      this.addToGraph(he);
    }
  }

  addToGraph(he) {
    addToListInMap(this.vertexToEdge, he.vertexA, he);
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

function removeFromListInMap(map, key, value) {
  let list = map.get(key);
  if (list) {
    const idx = list.indexOf(value);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }
}

function $DEBUG_OPERANDS(shell1, shell2) {
  if (DEBUG.OPERANDS_MODE) {
    __DEBUG__.HideSolids();
    __DEBUG__.AddVolume(shell1, 0x800080);
    __DEBUG__.AddVolume(shell2, 0xfff44f);
  }
}

function eq(v1, v2) {
  return math.areEqual(v1, v2, TOLERANCE);
}

function veq(v1, v2) {
  return math.areVectorsEqual(v1, v2, TOLERANCE);
}

function assert(name, cond) {
  if (!cond) {
    throw 'ASSERTION FAILED: ' + name;
  }
}

const MY = '__BOOLEAN_ALGORITHM_DATA__'; 

