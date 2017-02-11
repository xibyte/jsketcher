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
export const TOLERANCE_SQ = TOLERANCE * TOLERANCE;
export const TOLERANCE_HALF = TOLERANCE * 0.5;

const DEBUG = {
  OPERANDS_MODE: false,
  LOOP_DETECTION: false,
  FACE_FACE_INTERSECTION: false,
  FACE_EDGE_INTERSECTION: false,
  SEWING: false,
  EDGE_MERGING: false,
  NOOP: () => {}
};


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

  POINT_TO_VERT.clear();

  if (DEBUG.OPERANDS_MODE) {
    __DEBUG__.HideSolids();
    __DEBUG__.AddVolume(shell1, 0x800080);
    __DEBUG__.AddVolume(shell2, 0xfff44f);
  }
  let facesData = [];

  mergeVertices(shell1, shell2);

  initSolveData(shell1, facesData);
  initSolveData(shell2, facesData);
  
  markOverlappingFaces(shell1, shell2);
  intersectFaces(shell1, shell2, type !== TYPE.UNION);

  for (let faceData of facesData) {
    disassemble(faceData)
  }

  mergeOverlappingFaces(shell1, shell2);
  for (let faceData of facesData) {
    initGraph(faceData);
  }
  
  facesData = facesData.filter(fd => fd.merged !== true);

    const allFaces = [];
  //__DEBUG__.AddSegment(shell2.faces[0].outerLoop.halfEdges[0].vertexA.point, shell2.faces[0].outerLoop.halfEdges[0].vertexB.point)
  const newLoops = new Set();
  for (let faceData of facesData) {
    const face = faceData.face;
    if (DEBUG.LOOP_DETECTION) {
      __DEBUG__.Clear();
      __DEBUG__.AddFace(face, 0x00ff00);
      DEBUG.NOOP();
    }

    const loops = [];
    const seen = new Set();
    let edges = [];
    for (let e of face.edges) edges.push(e);
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
        if (DEBUG.LOOP_DETECTION) {
          __DEBUG__.AddHalfEdge(edge);
        }
        const isNew = EdgeSolveData.get(edge).newEdgeFlag === true;
        if (isNew) newLoops.add(loop);
        
        loop.halfEdges.push(edge);
        seen.add(edge);
        let candidates = faceData.vertexToEdge.get(edge.vertexB);
        if (!candidates) {
          break;
        }
        edge = findMaxTurningLeft(edge, candidates, face.surface.normal);
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
  let faces = sew(allFaces);
  faces = filterFaces(faces, newLoops);
  const result = new Shell();
  faces.forEach(face => {
    face.shell = result;
    result.faces.push(face);
  });

  cleanUpSolveData(result);
  BREPValidator.validateToConsole(result);
  return result;
}

function initGraph(faceData) {
  for (let he of faceData.face.edges) {
    addToListInMap(faceData.vertexToEdge, he.vertexA, he);
  }
}

function sew(allFaces) {
  
  const sewed = new Set();
  const sewedFaces = [];
  const analyzedNeighbors = new Map();
  FACES: 
  for (let face of allFaces) {
    if (DEBUG.SEWING) {
      __DEBUG__.Clear();
      __DEBUG__.AddFace(face, 0x00ff00);
    }
    let edges = [];
    for (let e of face.edges) edges.push(e);
    edges.sort((e1, e2) => EdgeSolveData.get(e1).newEdgeFlag === true ? 0 : 1);
    for (let h1 of face.edges) {
      if (DEBUG.SEWING) {
        __DEBUG__.AddHalfEdge(h1);
      }
      
      if (sewed.has(h1)) {
        continue;
      }
      const neighbors = findNeighborhood(allFaces, face, h1);
      if (neighbors.length == 0) {
        continue FACES;
      }
      let h2 = neighborhoodAnalysis(h1, neighbors, analyzedNeighbors);
      if (h2 == null) {
        continue FACES;
      }
      if (sewed.has(h2)) {
        throw 'illegal state. already sewed'
      }
      
      const edge = new Edge(h1.edge.curve);

      edge.halfEdge1 = h1;
      edge.halfEdge2 = h2;
      h1.edge = edge;
      h2.edge = edge;
      sewed.add(h1);
      sewed.add(h2);
    }
    sewedFaces.push(face);
  }
  return sewedFaces;
}

function neighborhoodAnalysis(edge, neighbors, analized) {
  if (neighbors.opposite.length > 1 || neighbors.other != null) {

    let paired = analized.get(edge);
    if (paired) {
      return paired;
    }
    
    let a1 = neighbors.opposite[0];
    let a2 = neighbors.opposite[1];
    let b1 = edge;
    let b2 = neighbors.other;
    if (!a1 || !a2) {
      a1 = edge;
      a2 = neighbors.other;
      b1 = neighbors.opposite[0];
      b2 = neighbors.opposite[1];
    } 

    if (!a2) {
      throw 'unsupported neighborhood case'
    }
    
    const a1N = a1.loop.face.surface.normal;
    const a2N = a2.loop.face.surface.normal;
    const b1N = b1.loop.face.surface.normal;
    const normal = a1N.cross(b1N);
    
    if (b2 == null) {
      const dist1 = leftTurningMeasure(b1N, a1N.negate(), normal);
      const dist2 = leftTurningMeasure(b1N, a2N.negate(), normal);
      if (dist1 > dist2) {
        analized.set(b1, a1);
        analized.set(a1, b1);
        analized.set(a2, null);
      }  else {
        analized.set(b1, a2);
        analized.set(a2, b1);
        analized.set(a1, null);
      }
    } else {
      const b2N = b2.loop.face.surface.normal;
      const dist1 = leftTurningMeasure(b1N, a1N.negate(), normal);
      const dist2 = leftTurningMeasure(b1N, a2N.negate(), normal);
      let closestDist, closestOption1, closestOption2, leftOver1, leftOver2;
      if (dist1 > dist2) {
        closestOption1 = a1;
        leftOver1 = a2;
        closestDist = dist1;
      }  else {
        closestOption1 = a2;
        leftOver1 = a1;
        closestDist = dist2;
      }
      // concurrent in between
      if (leftTurningMeasure(b1N, b2N, normal) > closestDist) {
        closestOption2 = b2;
        leftOver2 = b1;
      } else {
        closestOption2 = b1;
        leftOver2 = b2;
      }
      analized.set(closestOption1, closestOption2);
      analized.set(closestOption2, closestOption1);
      analized.set(leftOver1, leftOver2);
      analized.set(leftOver2, leftOver1);
      return analized.get(edge);
    }
  } else {
    return neighbors.opposite[0];
  }
}  
  
function findNeighborhood(allFaces, skipFace, forEdge) {
  const result = {
    opposite: [],
    other: null 
  };
  for (let face of allFaces) {
    if (face == skipFace) continue;
    for (let e of face.edges) {
      if (areEdgesOpposite(e, forEdge)) {
        result.opposite.push(e)
      } else if (e != forEdge && areEdgesEqual(e, forEdge)) {
        result.other = e;
      }
    }
  }
  return result;
}

function mergeVertices(shell1, shell2) {
  const toSwap = new Map();
  for (let v1 of shell1.vertices) {
    for (let v2 of shell2.vertices) {
      if (math.areVectorsEqual(v1.point, v2.point, TOLERANCE)) {
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

function markOverlappingFaces(shell1, shell2) {
  for (let face1 of shell1.faces) {
    for (let face2 of shell2.faces) {
      if (face1.surface.coplanarUnsigned(face2.surface, TOLERANCE)) {
        markOverlapping(face1, face2);
      }
    }
  }
}

function markOverlapping(face1, face2) {
  let data1 = face1.data[MY];
  let data2 = face2.data[MY];
  data1.overlaps.add(face2);
  data2.overlaps.add(face1);
}

function mergeOverlappingFaces(shell1, shell2) {
  for (let face1 of shell1.faces) {
    for (let face2 of shell2.faces) {
      if (face1.data[MY].overlaps.has(face2)) {
        doMergeOverlappingFaces(face1, face2);
      }
    }
  }
}

function doMergeOverlappingFaces(face1, face2) {
  const data2 = face2.data[MY];
  merge(face2, data2.newEdges);
  merge(face1, face2.edges);
  data2.merged = true;
}

function areEdgesEqual(e1, e2) {
  return e1.vertexA == e2.vertexA && e1.vertexB == e2.vertexB;
}

function areEdgesOpposite(e1, e2) {
  return e1.vertexA == e2.vertexB && e1.vertexB == e2.vertexA;
}

function disassemble(faceData) {
  merge(faceData.face, faceData.newEdges);
}

function merge(face, newEdges) {

  let allEdges = [];
  if (DEBUG.SEWING) {
    __DEBUG__.Clear();
    __DEBUG__.AddFace(face, 0x00ff00);
  }


  for (let e of face.edges) {
    if (findCoincidentEdge(e, allEdges) == null) {
      allEdges.push(e);
    }
  }
  
  nullifyOppositeEdges(newEdges);
  
  for (let e of newEdges) {
    if (e == null) continue; 
    if (findCoincidentEdge(e, allEdges) == null) {
      allEdges.push(e);
    }
  }
  
  nullifyOppositeEdges(allEdges);
  
  allEdges = allEdges.filter(e => e != null);
  function edgeOrder(e) {
    return EdgeSolveData.get(e).newEdgeFlag === true ? 1 : 0;
  }
  //put new edges to the tail
  allEdges.sort((e1, e2) => edgeOrder(e1) - edgeOrder(e2));
  face.outerLoop = new Loop();
  face.outerLoop.face = face;
  allEdges.forEach(he => face.outerLoop.halfEdges.push(he));
  if (DEBUG.SEWING) {
    for (let e of allEdges) __DEBUG__.AddHalfEdge(e, 0xffff00);
  }

  face.innerLoops = [];
}

function nullifyOppositeEdges(edges) {
  main:
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] == null) continue;
    for (let j = 0; j < edges.length; j++) {
      if (i == j) continue;
      if (edges[j] == null) continue;
      if (areEdgesOpposite(edges[i], edges[j])) {
        edges[i] = null; 
        edges[j] = null;
        continue main;
      }
    }
  }
}

function isEdgeInvalid(e) {
  return EdgeSolveData.get(e).invalid === true;
}

function chooseBetweenSimilarEdges(e1, e2) {
  // assert e1.vertexB == e2.vertexB
  const v = e1.vertexB;
  const face1 = e1.twin().face;
  const face2 = e2.twin().face;
  const data1 = face1.data[MY];
  const data2 = face2.data[MY];
  const cont1 = data1.vertexToEdge(v).filter(e => data1.newEdges.indexOf(e) == -1)[0];
  const cont2 = data2.vertexToEdge(v).filter(e => data2.newEdges.indexOf(e) == -1)[0];
  if (cont1 && areEdgesOpposite(cont1, e1)) {
    deleteEdge(e2.edge);
  } else if (cont2 && areEdgesOpposite(cont2, e1)) { // e1 ~ e2 , doesn't matter
    deleteEdge(e1.edge);
  }
}

function findCoincidentEdgeOnFace(edge, face) {
  for (let loop of face.loops) {
    const coi = findCoincidentEdge(edge, loop.halfEdges);
    if (coi != null) {
      return coi;
    }
  }
  return null;
}

function findCoincidentEdge(edge, edges) {
  for (let he of edges) {
    if (areEdgesEqual(edge, he)) {
      return he;
    }
  }
  return null;
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
  const beforeLength = out.length;
  const nestedLoops = getNestedLoops(originFace, loops);
  //loops.forEach(l => l.halfEdges.forEach(h => __DEBUG__.AddHalfEdge(h)))
  for (let nestedLoop of nestedLoops) {
    if (nestedLoop.loop.isCCW(originFace.surface)) {
      createFaces(nestedLoop);
    }
  }
  if (out.length > beforeLength) {
    out[beforeLength].id = originFace.id;
  }
}

function getNestedLoops(face, brepLoops) {
  const tr = face.surface.get2DTransformation();
  function NestedLoop(loop) {
    this.loop = loop;
    this.nesting = [];
    this.level = 0;
  }

  const loops = brepLoops.map(loop => new NestedLoop(loop));
  function contains(loop, other) {
    for (let point of other.asPolygon()) {
      if (!classifyPointInsideLoop(tr.apply(point), loop, tr).inside) {
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
      if (contains(loop.loop, other.loop)) {
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

function findMaxTurningLeft(edge, edges, normal) {
  edges = edges.slice();
  function edgeVector(edge) {
    return edge.vertexB.point.minus(edge.vertexA.point)._normalize();
  }
  const edgeV = edgeVector(edge);
  edges.sort((e1, e2) => {
    return leftTurningMeasure(edgeV, edgeVector(e1), normal) - leftTurningMeasure(edgeV, edgeVector(e2), normal);
  });
  return edges[0];
}

function leftTurningMeasure(v1, v2, normal) {
  let measure = v1.dot(v2);
  if (v1.cross(v2).dot(normal) < 0) {
    measure *= -1;
    measure += 2;
  }
  return measure
}

function intersectFaces(shell1, shell2, inverseCrossEdgeDirection) {
  for (let i = 0; i < shell1.faces.length; i++) {
    const face1 = shell1.faces[i];
    if (DEBUG.FACE_FACE_INTERSECTION) {
      __DEBUG__.Clear(); __DEBUG__.AddFace(face1, 0x00ff00);
      DEBUG.NOOP();
    }
    for (let j = 0; j < shell2.faces.length; j++) {
      const face2 = shell2.faces[j];
      if (DEBUG.FACE_FACE_INTERSECTION) {
        __DEBUG__.Clear(); __DEBUG__.AddFace(face1, 0x00ff00);
        __DEBUG__.AddFace(face2, 0x0000ff);
        if (face1.refId == 0 && DEBUG.face2.refId == 0) {
          DEBUG.NOOP();
        }
      }

      if (face1.data[MY].overlaps.has(face2)) {
        continue;
      }
      const curve = face1.surface.intersect(face2.surface);
  
      const nodes = [];
      collectNodesOfIntersectionOfFace(face2, face1, nodes);
      collectNodesOfIntersectionOfFace(face1, face2, nodes);
      
      const newEdges = [];
      const direction = face1.surface.normal.cross(face2.surface.normal);
      if (inverseCrossEdgeDirection) {
        direction._multiply(-1);
      }
      calculateNodeNormals(nodes, curve);
      filterNodes(nodes);
      split(nodes, newEdges, curve, direction);

      newEdges.forEach(e => {
        addNewEdge(face1, e.halfEdge1);
        addNewEdge(face2, e.halfEdge2);
      });
    }
  }
}

function addNewEdge(face, halfEdge) {
  var data = face.data[MY];
  data.newEdges.push(halfEdge);
  halfEdge.loop = data.loopOfNew;
  EdgeSolveData.createIfEmpty(halfEdge).newEdgeFlag = true;
  //addToListInMap(data.vertexToEdge, halfEdge.vertexA, halfEdge);
  return true;
}

function calculateNodeNormals(nodes, curve) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n != null) {
      n.normal = nodeNormal(n.point, n.edge, curve);
      if (n.normal == 0) {
        nodes[i] = null;
      }
    }
  }
}

function filterNodes(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const node1 = nodes[i];
    if (node1 == null) continue;
    for (let j = 0; j < nodes.length; j++) {
      if (i == j) continue;
      const node2 = nodes[j];
      if (node2 != null) {
        if (node2.vertex == node1.vertex) {
          if (node1.normal + node2.normal == 0) {
            nodes[i] = null
          } 
          nodes[j] = null
        }
      }
    }
  }
}

function faceContainsSimilarEdge(face, halfEdge) {
  for (let loop of face.loops) {
    for (let he of loop.halfEdges) {
      if (areEdgesEqual(halfEdge, he) || areEdgesOpposite(halfEdge, he)) {
        return true;
      }
    }
  }
  return false;
}

function collectNodesOfIntersectionOfFace(splittingFace, face, nodes) {
  for (let loop of face.loops) {
    collectNodesOfIntersection(splittingFace, loop, nodes);
  }
}

function collectNodesOfIntersection(face, loop, nodes) {
  for (let edge of loop.halfEdges) {
    const edgeSolveData = EdgeSolveData.get(edge);
    if (edgeSolveData.skipFace.has(face)) {
      continue;
    }
    const preExistVertex = edgeSolveData.splitByFace.get(face);
    if (preExistVertex) {
      nodes.push(new Node(preExistVertex, edge, face));
      continue
    }
    intersectFaceWithEdge(face, edge, nodes);
  }
}

function split(nodes, result, onCurve, direction) {
  for (let i = 0; i < nodes.length; i++) {
    let inNode = nodes[i];
    //if (i == 0)  __DEBUG__.AddPoint(inNode.vertex.point);

    if (inNode == null) continue;
    nodes[i] = null;
    let closestIdx = findCloserOnCurve(nodes, inNode, onCurve);
    if (closestIdx == -1) {
      continue;
    }
    let outNode = nodes[closestIdx];
    //if (i == 1)  __DEBUG__.AddPoint(outNode.vertex.point);
    //if (i == 1)  __DEBUG__.AddSegment(inNode.point, inNode.point.plus(inNode.normal.multiply(1000)));
    //__DEBUG__.AddSegment(new Vector(),  outNode.normal.multiply(100));

    if (outNode.normal * inNode.normal > 0) {
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
    
    //check for corner case when to faces only intersects in edges
    if (!containsEdges(result, edge)) {
      result.push(edge);
    }
  }
}

function containsEdges(edges, edge) {
  for (let e of edges) {
    if (isSameEdge(e, edge)) {
      return true;
    }
  }
  return false;
}

function isSameEdge(e1, e2) {
  return areEdgesEqual(e1.halfEdge1, e2.halfEdge1);
}


function splitEdgeByVertex(originHalfEdge, vertex, splittingFace) {
  
  function splitHalfEdge(h) {
    const newEdge = new HalfEdge();
    newEdge.vertexA = vertex;
    newEdge.vertexB = h.vertexB;
    h.vertexB = newEdge.vertexA;
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

  //EdgeSolveData.createIfEmpty(twin).splitByFace.set(splittingFace, vertex);
  //EdgeSolveData.createIfEmpty(newTwin).skipFace.add(splittingFace);
}

function findCloserOnCurve(nodes, toNode, curve) {
  let hero = -1;
  let heroDistance = Number.MAX_VALUE;
  const origin = curve.t(toNode.point);
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node == null) continue;
    let inward = toNode.normal * node.normal < 0;
    let distance = Math.abs(origin - curve.t(node.point));
    if (inward && distance < heroDistance) {
      hero = i;
      heroDistance = distance;
    }
  }
  return hero;
}

const POINT_TO_VERT = new Map();
function newVertex(point) {
  let vertex = POINT_TO_VERT.get(point);
  if (!vertex) {
    vertex = new Vertex(point);
    duplicatePointTest(point);
    POINT_TO_VERT.set(point, vertex);
  }
  return vertex;
}

function intersectFaceWithEdge(face, edge, result) {

  if (DEBUG.FACE_EDGE_INTERSECTION) {
    __DEBUG__.Clear();
    __DEBUG__.AddFace(face, 0x00ffff);
    __DEBUG__.AddFace(edge.loop.face, 0xffffff);
    __DEBUG__.AddHalfEdge(edge, 0xffff00);
    DEBUG.NOOP();
  }

  const p0 = edge.vertexA.point;
  const ab = edge.vertexB.point.minus(p0);
  const length = ab.length();
  const v = ab._multiply(1 / length);
  
  if (math.areEqual(edge.edge.curve.v.dot(face.surface.normal), 0, TOLERANCE_SQ)) {
    return; // we not consider edges parallel to the face
  }
  let pointOfIntersection = edge.edge.curve.pointOfSurfaceIntersection(face.surface);
  let t = new Line(p0, v).t(pointOfIntersection);
  let pInsideSeg = t >= 0 && t <= length;
  
  const coiA = math.areVectorsEqual(edge.vertexA.point, pointOfIntersection, TOLERANCE);
  const coiB = math.areVectorsEqual(edge.vertexB.point, pointOfIntersection, TOLERANCE);
  if (coiA) pointOfIntersection = edge.vertexA.point;
  if (coiB) pointOfIntersection = edge.vertexB.point;
  if (coiA || coiB || pInsideSeg) {
    const classRes = classifyPointToFace(pointOfIntersection, face);
    if (classRes.inside) {
      let vertexOfIntersection;
      if (classRes.vertex) {
        vertexOfIntersection = classRes.vertex;
      } else if (coiA) {
        vertexOfIntersection = edge.vertexA;
        //console.log("point A on surface");
      } else if (coiB) {
        vertexOfIntersection = edge.vertexB;
        //console.log("point B on surface");
      } else {
        vertexOfIntersection = newVertex(pointOfIntersection);
      }

      const node = new Node(vertexOfIntersection, edge);
      result.push(node);
      if (classRes.edge) {
        splitEdgeByVertex(classRes.edge, vertexOfIntersection, edge.loop.face);
      } 
    }
  }
}

function deleteEdge(edge) {
  if (edge.halfEdge1 != null) {
    deleteHalfEdge(edge.halfEdge1);
  }
  if (edge.halfEdge2 != null) {
    deleteHalfEdge(edge.halfEdge2);
  }
}

function deleteHalfEdge(he) {
  EdgeSolveData.createIfEmpty(he).invalid = true;
  removeFromListInMap(he.loop.face.data[MY].vertexToEdge, he.vertexA, he);
}

function classifyPointToFace(point, face) {
  function ccwCorrection(result, loop) {
    if (!loop.isCCW(face.surface)) {
      result.inside = !result.inside; 
    }
    return result;
  }
  const tr = face.surface.get2DTransformation();
  const point2d = tr.apply(point);
  const outer = classifyPointInsideLoop(point2d, face.outerLoop, tr);
  
  if (outer.inside) {
    if (outer.vertex || outer.edge) {
      return outer;
    }
  }
  
  for (let innerLoop of face.innerLoops) {
    const inner = classifyPointInsideLoop(point2d, innerLoop, tr);
    if (inner.vertex || inner.edge) {
      return inner;
    }
    if (inner.inside) {
      return ccwCorrection(outer, innerLoop);
    }
  }

  return ccwCorrection(outer, face.outerLoop);
}

function nodeNormal(point, edge, curve) {
  const edgeTangent =  edgeNormal(edge); // todo @ point
  const curveTangent = curve.v; //todo @ point
  let dot = edgeTangent.dot(curveTangent);
  if (math.areEqual(dot, 0, TOLERANCE)) {
    dot = 0;
  } else {
    if (dot < 0) 
      dot = -1;
    else 
      dot = 1;
  }
  return dot;
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
    result.push(new Node(pointOfIntersection, edge));
  }
}

function EdgeSolveData() {
  this.splitByFace = new Map();
  this.skipFace = new Set();
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

function Node(vertex, splitsEdge, splittingFace) {
  this.vertex = vertex;
  this.normal = 0;
  this.point = vertex.point;
  this.edge = splitsEdge;
  this.splittingFace = splittingFace;
  //__DEBUG__.AddPoint(this.point);
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
    this.loopOfNew = new Loop();
    this.newEdges = this.loopOfNew.halfEdges;
    this.vertexToEdge = new Map();
    this.overlaps = new Set();
    this.loopOfNew.face = face;
  }
}

export function classifyPointInsideLoop( inPt, loop, tr ) {
  
  function VertexResult(vertex) {
    this.inside = true;
    this.vertex = vertex;
  }

  function EdgeResult(edge) {
    this.inside = true;
    this.edge = edge;
  }

  const _2dCoords = new Map();
  for( let edge of loop.halfEdges ) {
    const p = tr.apply(edge.vertexA.point);
    if (math.areEqual(inPt.y, p.y, TOLERANCE) && math.areEqual(inPt.x, p.x, TOLERANCE)) {
      return new VertexResult(edge.vertexA);
    }
    _2dCoords.set(edge.vertexA, p);
  }

  const grads = [];
  for( let edge of loop.halfEdges ) {
    const a = _2dCoords.get(edge.vertexA);
    const b = _2dCoords.get(edge.vertexB);
    const dy = b.y - a.y;
    if (math.areEqual(dy, 0, TOLERANCE)) {
      grads.push(0)
    } else if (dy > 0) {
      grads.push(1)
    } else {
      grads.push(-1)
    }
  }

  function nextGrad(start) {
    for(let i = 0; i < grads.length; ++i) {
      const idx = (i + start + 1) % grads.length; 
      if (grads[idx] != 0) {
        return grads[idx];
      }
    }    
  }

  function prevGrad(start) {
    for(let i = 0; i < grads.length; ++i) {
      const idx = (start - i - 1 + grads.length) % grads.length;
      if (grads[idx] != 0) {
        return grads[idx];
      }
    }
  }
  
  const skip = new Set();

  let inside = false;
  for( let i = 0; i < loop.halfEdges.length; ++i) {

    const edge = loop.halfEdges[i];

    var shouldBeSkipped = skip.has(edge.vertexA) || skip.has(edge.vertexB);

    const a = _2dCoords.get(edge.vertexA);
    const b = _2dCoords.get(edge.vertexB);

    const aEq = math.areEqual(inPt.y, a.y, TOLERANCE);
    const bEq = math.areEqual(inPt.y, b.y, TOLERANCE);

    if (aEq) {
      skip.add(edge.vertexA);
    }  
    if (bEq) {
      skip.add(edge.vertexB);
    }

    if (math.areVectorsEqual(a, b, TOLERANCE)) {
      console.error('unable to classify invalid polygon');
    }
    
    var edgeLowPt  = a;
    var edgeHighPt = b;

    var edgeDx = edgeHighPt.x - edgeLowPt.x;
    var edgeDy = edgeHighPt.y - edgeLowPt.y;

    if (aEq && bEq) {
      if ( ( ( edgeHighPt.x <= inPt.x ) && ( inPt.x <= edgeLowPt.x ) ) ||
           ( ( edgeLowPt.x <= inPt.x ) && ( inPt.x <= edgeHighPt.x ) ) ) {
        return	new EdgeResult(edge);
      }	else {
        continue;
      }
    }

    if (shouldBeSkipped) {
      continue;
    }

    if ( edgeDy < 0 ) {
      edgeLowPt  = b; edgeDx = - edgeDx;
      edgeHighPt = a; edgeDy = - edgeDy;
    }
    if (!aEq && !bEq && ( inPt.y < edgeLowPt.y || inPt.y > edgeHighPt.y ) ) {
      continue;
    }

    if (bEq) {
      if (grads[i] * nextGrad(i) < 0) {
        continue;
      }
    } else if (aEq) {
      if (grads[i] * prevGrad(i) < 0) {
        continue;
      }
    }

    let perpEdge = edgeDx * (inPt.y - edgeLowPt.y) - edgeDy * (inPt.x - edgeLowPt.x);
    if ( math.areEqual(perpEdge, 0, TOLERANCE_SQ) ) return new EdgeResult(edge);		// inPt is on contour ?
    if ( perpEdge < 0 ) {
      continue;
    }
    inside = ! inside;		// true intersection left of inPt
  }

  return	{inside};
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
    if (idx != -1) {
      list.splice(idx, 1);
    }
  }
}

const MY = '__BOOLEAN_ALGORITHM_DATA__'; 
let xxx = 0;
