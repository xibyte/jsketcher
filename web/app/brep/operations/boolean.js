import {BREPValidator} from '../brep-validator';
import {Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import {evolveFace} from './evolve-face'
import * as math from '../../math/math';
import {eqEps, eqTol, TOLERANCE, ueq, veq} from '../geom/tolerance';

const DEBUG = {
  OPERANDS_MODE: false,
  LOOP_DETECTION: true,
  FACE_FACE_INTERSECTION: false,
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
  initVertexFactory(shell1, shell2);

  intersectEdges(shell1, shell2);

  initSolveData(shell1, facesData);
  initSolveData(shell2, facesData);

  intersectFaces(shell1, shell2, type);

  for (let faceData of facesData) {
    faceData.initGraph();
  }

  for (let faceData of facesData) {
    faceData.detectedLoops = detectLoops(faceData.face);
  }
  
  let detectedLoops = new Set();
  for (let faceData of facesData) {
    for (let loop of faceData.detectedLoops) {
      detectedLoops.add(loop);
    }
  }

  // let invalidLoops = invalidateLoops(detectedLoops);
  
  let faces = [];
  
  for (let faceData of facesData) {
    // faceData.detectedLoops = faceData.detectedLoops.filter(l => !invalidLoops.has(l));
    loopsToFaces(faceData.face, faceData.detectedLoops, faces);
  }

  faces = filterFaces(faces);
  
  
  const result = new Shell();
  faces.forEach(face => {
    face.shell = result;
    result.faces.push(face);
  });

  cleanUpSolveData(result);
  BREPValidator.validateToConsole(result);

  // __DEBUG__.ClearVolumes();
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
  while (true) {
    let edge = faceData.graphEdges.pop();
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
      seen.add(edge);
      loop.halfEdges.push(edge);
      if (loop.halfEdges[0].vertexA === edge.vertexB) {
        loop.link();
        loops.push(loop);
        break;
      }
      
      let candidates = faceData.vertexToEdge.get(edge.vertexB);
      if (!candidates) {
        break;
      }
      edge = findMaxTurningLeft(edge, candidates, surface);
      if (seen.has(edge)) {
        break;
      }
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


function filterFaces(faces) {


  return faces.filter(raycastFilter);
  
  
  //
  // function isFaceContainNewEdge(face) {
  //   for (let e of face.edges) {
  //     if (isNewNM(e)) {
  //       return true;
  //     }
  //   }
  //   return false;
  // }
  //
  // const validFaces = new Set(faces);
  // const result = new Set();
  // for (let face of faces) {
  //   __DEBUG__.Clear();
  //   __DEBUG__.AddFace(face);
  //   traverseFaces(face, validFaces, (it) => {
  //     if (result.has(it) || isFaceContainNewEdge(it)) {
  //       result.add(face);
  //       return true;
  //     }
  //   });
  // }
  // return result;
}

function raycastFilter(face, shell, opType) {
  
  let testPt = getPointOnFace(face);
  let testCurve = ;
  
  
  for (let testFace of face.faces) {
    let pts = testFace.surface.intersectCurve(testCurve)
    
  }
  
  
  
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
    if (!validFaces.has(face)) continue;
    for (let loop of face.loops) {
      for (let halfEdge of loop.halfEdges) {
        for (let twin of halfEdge.twins()) {
          if (validFaces.has(twin.loop.face)) {
            stack.push(twin.loop.face)
          }
        }
      }
    }
  }
}

function invalidateLoops(newLoops) {
  // __DEBUG__.Clear();
  const invalid = new Set();
  for (let loop of newLoops) {
    // __DEBUG__.AddLoop(loop);
    for (let e of loop.halfEdges) {
      if (e.manifold !== null) {
        let manifold = [e,  ...e.manifold];
        manifold.filter(me => newLoops.has(me.twin().loop));
        if (manifold.length === 0) {
          invalid.add(loop);
        } else {
          let [me, ...rest] = manifold;
          e.edge = me.edge;
          e.manifold = rest.length === 0 ? null : rest;
        }
      } else {
        if (!newLoops.has(e.twin().loop)) {
          invalid.add(loop);
          break;
        }
      }
    }
  }
  
  // const seen = new Set();
  //
  // const stack = Array.from(invalid);
  //
  // while (stack.length !== 0) {
  //   let loop = stack.pop();
  //   if (!seen.has(loop)) continue;
  //   seen.add(loop);
  //    
  //   for (let he of loop.halfEdges) {
  //     let twins = he.twins();
  //     for (let twin of twins) {
  //       invalid.add(twin.loop);
  //       stack.push(twin.loop); 
  //     }        
  //   }
  // }
  return invalid;  
}

export function loopsToFaces(originFace, loops, out) {
  const newFaces = evolveFace(originFace, loops);
  for (let newFace of newFaces) {
    out.push(newFace);
  }
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
  const pivot = pivotEdge.tangent(pivotEdge.vertexB.point).negate();
  const normal = surface.normal(pivotEdge.vertexB.point);
  edges.sort((e1, e2) => {
    let delta = leftTurningMeasure(pivot, edgeVector(e1), normal) - leftTurningMeasure(pivot, edgeVector(e2), normal);
    if (ueq(delta, 0)) {
      return isNew(e1) ? (isNew(e2) ? 0 : -1) : (isNew(e2) ? 1 : 0) 
    }
    return delta;
  });
  return edges[0];
}

function leftTurningMeasure(v1, v2, normal) {
  let measure = v1.dot(v2);
  if (ueq(measure, 1)) {
    return 0;    
  }
  measure += 3; //-1..1 => 2..4
  if (v1.cross(v2).dot(normal) < 0) {
    measure = 4 - measure;
  }
  //make it positive all the way
  return measure;
}

function intersectEdges(shell1, shell2) {
  let isecs = new Map();
  function addIsesc(e, params) {
    let allParams = isecs.get(e);
    if (!allParams) {
      isecs.set(e, params);
    } else {
      params.forEach(p => allParams.push(p));
    }
  }
  for (let e1 of shell1.edges) {
    for (let e2 of shell2.edges) {
      let points = e1.curve.intersectCurve(e2.curve, TOLERANCE);
      if (points.length !== 0) {
        const vertexHolder = [];
        addIsesc(e1, points.map(p => ({u: p.u0, vertexHolder})));
        addIsesc(e2, points.map(p => ({u: p.u1, vertexHolder})));
      }
    }
  }
  for (let [e, points] of isecs) {
    points.sort((p1, p2) => p1.u - p2.u);
    let first = points[0];
    let last = points[points.length - 1];
    if (ueq(first.u, 0) && !first.vertexHolder[0]) {
      first.vertexHolder[0] = e.halfEdge1.vertexA;
      first.skip = true;
    }
    if (ueq(last.u, 1) && !last.vertexHolder[0]) {
      last.vertexHolder[0] = e.halfEdge1.vertexB;
      last.skip = true;
    }
  }
  for (let [e, points] of isecs) {
    for (let {u, vertexHolder} of points ) {
      if (!vertexHolder[0]) {
        vertexHolder[0] = vertexFactory.create(e.curve.point(u));
      }
    }
  }
  for (let [e, points] of isecs) {
    for (let {u, vertexHolder, skip} of points ) {
      if (skip === true) {
        continue;
      }
      let split = splitEdgeByVertex(e, vertexHolder[0]);
      if (split !== null) {
        e = split[1];
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

      let curves = face1.surface.intersectSurface(face2.surface);

      for (let curve of curves) {
        // __DEBUG__.AddCurve(curve);
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
        if (ueq(node2.u, node1.u)) {
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
  // __DEBUG__.AddCurve(curve, 0xffffff);
  // __DEBUG__.AddHalfEdge(edge, 0xff00ff);
  const points = edge.edge.curve.intersectCurve(curve, TOLERANCE);
  for (let point of points) {
    const {u0, u1} = point;

    let vertex;
    if (ueq(u0, 0)) {
      vertex = edge.edge.halfEdge1.vertexA;
    } else if (ueq(u0, 1)) {
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
    if (inNode.normal === -1) {
      continue
    }
    let edgeCurve = curve;
    if (!ueq(inNode.u, 0)) {
      [,edgeCurve] = edgeCurve.split(inNode.vertex.point);
    }
    if (!ueq(outNode.u, 1)) {
      [edgeCurve] = edgeCurve.split(outNode.vertex.point);
    }
    const edge = new Edge(edgeCurve, inNode.vertex, outNode.vertex);
    result.push(edge);
  }
  for (let {edge, vertex} of nodes) {
    splitEdgeByVertex(edge.edge, vertex);
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

function isNewNM(edge) {
  if (edge.manifold === null) {
    return isNew(edge);
  }
  for (let me of edge.manifold) {
    if (isNew(me)) {
      return true;
    }
  }
  return isNew(edge); 
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
    this.graphEdges = [];
  }

  initGraph() {
    this.vertexToEdge.clear();
    for (let he of this.face.edges) {
      this.addToGraph(he);
    }
    this.removeOppositeEdges();
  }

  addToGraph(he) {
    // __DEBUG__.Clear();
    // __DEBUG__.AddFace(he.loop.face);
    // __DEBUG__.AddHalfEdge(he, 0xffffff);
    let list = this.vertexToEdge.get(he.vertexA);
    if (!list) {
      list = [];
      this.vertexToEdge.set(he.vertexA, list);
    } else {
      for (let ex of list) {
        if (he.vertexB === ex.vertexB && isSameEdge(he, ex)) {
          ex.attachManifold(he);    
          return; 
        }          
      }
    }
    list.push(he);
    this.graphEdges.push(he);
  }

  removeOppositeEdges() {
    let toRemove = new Set();
    for (let e1 of this.graphEdges) {
      let others = this.vertexToEdge.get(e1.vertexB);
      for (let e2 of others) {
        if (e1 === e2) continue;
        if (e1.vertexA === e2.vertexB && isSameEdge(e1, e2)) {
          toRemove.add(e1);
          toRemove.add(e2);
        }
      }
    }
    for (let e of toRemove) {
      removeFromListInMap(this.vertexToEdge, e.vertexA, e);
    }
    this.graphEdges = this.graphEdges.filter(e => !toRemove.has(e));
  }
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

function isSameEdge(e1, e2) {
  let tess = e1.tessellate();
  for (let pt1 of tess) {
    let pt2 = e2.edge.curve.point(e2.edge.curve.param(pt1));
    if (!veq(pt1, pt2)) {
      return false;
    }
  }
  return true;
}

function $DEBUG_OPERANDS(shell1, shell2) {
  if (DEBUG.OPERANDS_MODE) {
    __DEBUG__.HideSolids();
    __DEBUG__.AddVolume(shell1, 0x800080);
    __DEBUG__.AddVolume(shell2, 0xfff44f);
  }
}

const eq = eqTol;

function assert(name, cond) {
  if (!cond) {
    throw 'ASSERTION FAILED: ' + name;
  }
}

const MY = '__BOOLEAN_ALGORITHM_DATA__'; 


