import {BREPValidator} from '../brep-validator';
import {Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import {evolveFace} from './evolve-face'
import * as math from '../../math/math';
import {eqTol, TOLERANCE, ueq, veq, veqNeg} from '../geom/tolerance';
import CadError from "../../utils/errors";
import {createBoundingNurbs} from "../brep-builder";
import BREP_DEBUG from '../debug/brep-debug';
import {Face} from "../topo/face";


const A = 0, B = 1;

const DEBUG = {
  OPERANDS_MODE: false,
  LOOP_DETECTION: false,
  FACE_FACE_INTERSECTION: false,
  RAY_CAST: false,
  FACE_MERGE: false,
  NOOP: () => {}
};

const TYPE = {
  UNION: 'UNION',
  INTERSECT: 'INTERSECT',
  SUBTRACT: 'SUBTRACT'
};

export function union( shell1, shell2 ) {
  return BooleanAlgorithm(shell1, shell2, TYPE.UNION);
}

export function intersect( shell1, shell2 ) {
  return BooleanAlgorithm(shell1, shell2, TYPE.INTERSECT);
}

export function subtract( shell1, shell2 ) {
  return BooleanAlgorithm(shell1, shell2, TYPE.SUBTRACT);
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
  shell.data.inverted = !shell.data.inverted;
  checkShellForErrors(shell, 'UNABLE_BOOLEAN_OPERAND_INVERSION');
}

function checkShellForErrors(shell, code) {
  let errors = BREPValidator.validate(shell);
  if (errors.length !== 0) {
    throw new CadError(code, errors);
  }
}

let EDGE_REPLACE = [];

export function BooleanAlgorithm( shellA, shellB, type ) {
  
  //fixme
  EDGE_REPLACE = [];
  
  BREP_DEBUG.startBooleanSession(shellA, shellB, type);

  shellA = prepareWorkingCopy(shellA);
  shellB = prepareWorkingCopy(shellB);
  
  BREP_DEBUG.setBooleanWorkingOperands(shellA, shellB);

  if (type === TYPE.SUBTRACT) {
    invert(shellB);
    type = TYPE.INTERSECT;
  }

  let facesData = [];

  mergeVertices(shellA, shellB);
  initVertexFactory(shellA, shellB);

  intersectEdges(shellA, shellB);
  let mergedFaces = mergeOverlappingFaces(shellA, shellB, type);

  initSolveData(shellA, facesData);
  initSolveData(shellB, facesData);

  intersectFaces(shellA, shellB, type);

  replaceEdges();
  
  replaceMergedFaces(facesData, mergedFaces);
  for (let faceData of facesData) {
    faceData.initGraph();
  }
  
  checkFaceDataForError(facesData);
  
  for (let faceData of facesData) {
    faceData.detectedLoops = detectLoops(faceData.face.surface, faceData);
  }
  
  for (let faceData of facesData) {
    for (let loop of faceData.detectedLoops) {
      loop.link();
    }
  }
  
  removeInvalidLoops(facesData);
  
  let faces = [];
  
  for (let faceData of facesData) {
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
  BREP_DEBUG.setBooleanResult(result);
  return result;
}

function removeInvalidLoops(facesData) {
  let detectedLoopsSet = new Set();
  for (let faceData of facesData) {
    for (let loop of faceData.detectedLoops) {
      detectedLoopsSet.add(loop);
    }
  }

  function isLoopInvalid(loop) {
    //discarded by face merge routine || has reference to not reassembled loop 
    return !detectedLoopsSet.has(loop);
  }
  
  for (let faceData of facesData) {
    faceData.detectedLoops = faceData.detectedLoops.filter(
      loop => loop.halfEdges.find(e => isLoopInvalid(e.twin().loop)) === undefined);
  }
}

function replaceEdges() {
  for (let {from, to} of EDGE_REPLACE) {
    from.replace(to);
  }
}

function replaceMergedFaces(facesData, mergedFaces) {
  function addDecayed(he, out) {
    let decayed = EdgeSolveData.get(he).decayed;
    if (decayed) {
      decayed.forEach(de => addDecayed(de, out));
    } else {
      out.push(he);
    }
  }
  filterInPlace(facesData, ({face}) => 
      mergedFaces.find(({originFaces}) => originFaces.indexOf(face) > -1) === undefined
  );
  for (let {mergedLoops, referenceSurface, originFaces} of mergedFaces) {
    let fakeFace = new Face(referenceSurface);
    for (let mergedLoop of mergedLoops) {
      let actualHalfEdges = [];
      mergedLoop.halfEdges.forEach(he => addDecayed(he, actualHalfEdges));
      mergedLoop.halfEdges = actualHalfEdges;
      fakeFace.innerLoops.push(mergedLoop);
      mergedLoop.face = fakeFace;
      mergedLoop.link();
    }
    facesData.push(initSolveDataForFace(fakeFace));
    for (let originFace of originFaces) {
      originFace.data[MY].newEdges.forEach(e => addNewEdge(fakeFace, e));
    }
  }
}

function prepareWorkingCopy(_shell) {
  let workingCopy = _shell.clone();
  setAnalysisFace(_shell, workingCopy);
  cleanUpSolveData(workingCopy);
  return workingCopy;
}

function setAnalysisFace(originShell, clonedShell) {
  for (let i = 0; i < originShell.faces.length; ++i) {
    clonedShell.faces[i].analysisFace = originShell.faces[i];
  }  
}

function detectLoops(surface, graph) {
  graph.graphEdges.sort((e1, e2) => getPriority(e1) - getPriority(e2));
  BREP_DEBUG.startBooleanLoopDetection(graph);
  const loops = [];
  const seen = new Set();
  while (true) {
    let edge = graph.graphEdges.pop();
    if (!edge) {
      break;
    }
    if (seen.has(edge)) {
      continue;
    }
    const loop = new Loop(null);
    BREP_DEBUG.booleanLoopDetectionBeginLoop();
    while (edge) {
      BREP_DEBUG.booleanLoopDetectionStep(edge);
      seen.add(edge);
      loop.halfEdges.push(edge);
      if (loop.halfEdges[0].vertexA === edge.vertexB) {
        loops.push(loop);
        BREP_DEBUG.booleanLoopDetectionSuccess(loop);
        break;
      }
      
      let candidates = graph.vertexToEdge.get(edge.vertexB);
      if (!candidates) {
        break;
      }
      candidates = candidates.filter(c => c.vertexB !== edge.vertexA || !isSameEdge(c, edge)); //TODO: we don't need the check for the same edge
      edge = findMaxTurningLeft(edge, candidates, surface);
      BREP_DEBUG.booleanLoopDetectionNextStep(candidates, edge);
      if (seen.has(edge)) {
        break;
      }
    }
  }
  return loops;
}


function findOverlappingFaces(shell1, shell2) {

  function overlapsImpl(face1, face2) {
    function pointOnFace(face, pt) {
      return face.env2D().pip(face.surface.workingPoint(pt)).inside;
    }
    for (let e1 of face1.edges) {
      if (pointOnFace(face2, e1.vertexA.point)) {
        return true;    
      }
    }
  }

  function overlaps(face1, face2) {
    let ss1 = face1.surface.simpleSurface; 
    let ss2 = face2.surface.simpleSurface; 
    if (ss1 !== null && ss2 !== null && ss1.TYPE === 'plane' && ss1.TYPE === ss2.TYPE && 
        ss1.coplanarUnsigned(ss2)) {
      return overlapsImpl(face1, face2) || overlapsImpl(face2, face1);        
    }
    return false;  
  }

  let overlapGroups = [];

  for (let face1 of shell1.faces) {
    for (let face2 of shell2.faces) {
      if (DEBUG.FACE_MERGE) {
        __DEBUG__.Clear();
        __DEBUG__.AddFace(face1, 0x0000ff);
        __DEBUG__.AddFace(face2);
      }
      if (overlaps(face1, face2) ) {
        let group = overlapGroups.find(g => g[0].has(face1) || g[1].has(face2));
        if (!group) {
          group = [new Set(), new Set()];    
          overlapGroups.push(group);
        } 
        group[0].add(face1);
        group[1].add(face2);
      }
    }
  }
  return overlapGroups;
}

function mergeOverlappingFaces(shellA, shellB, opType) {
  let groups = findOverlappingFaces(shellA, shellB);
  BREP_DEBUG.setOverlappingFaces(groups);
  let mergedFaces = [];
  for (let [groupA, groupB] of groups) {
    let faceMergeInfo = mergeFaces(Array.from(groupA), Array.from(groupB), opType);
    mergedFaces.push(faceMergeInfo);
  }
  return mergedFaces;
}

function mergeFaces(facesA, facesB, opType) {
  let originFaces = [...facesA, ...facesB];
  let allPoints = [];

  for (let face of originFaces) {
    for (let e of face.edges) {
      allPoints.push(e.vertexA.point);
    }
  }

  let originFace = facesA[0];
  let referenceSurface = createBoundingNurbs(allPoints, originFace.surface.simpleSurface);
  
  let valid = new Set();
  let invalid = new Set();
  
  function classify(inside, testee) {
    if (inside && opType === TYPE.INTERSECT) {
      valid.add(testee);
      return true;
    } else if (!inside && opType === TYPE.INTERSECT) {
      invalid.add(testee);
      return false;
    } else if (inside && opType === TYPE.UNION) {
      invalid.add(testee);
      return false;
    } else if (!inside && opType === TYPE.UNION) {
      valid.add(testee);
      return true;
    } else {
      throw 'invariant';
    }
  }

  function invalidate(faceA, faceB) {
    
    let coincidentEdges = new Set();
    
    function checkCoincidentEdges(edgeA, edgeB) {
      if (isSameEdge(edgeA, edgeB)) {
        coincidentEdges.add(edgeA);
        coincidentEdges.add(edgeB);
        markEdgeTransferred(edgeA.edge);
        markEdgeTransferred(edgeB.edge);
        if (edgeA.vertexA === edgeB.vertexA) {
          // chooseBetweenEqualEdges();
          // canEdgeBeTransferred(edge, face, opType)
          throw new CadError('BOOLEAN_INVALID_RESULT', edgeCollisionError(edgeA, edgeB));
        } else if (edgeA.vertexA === edgeB.vertexB) {

          invalid.add(edgeA);
          invalid.add(edgeB);
          // markEdgeToReplace(testee, edge.twin());
        } 
      }  
    }


    function invalidateEdge(face, edge) {
      let pt = edge.edge.curve.middlePoint();
      if (face.rayCast(pt).inside) {
        markEdgeTransferred(edge.edge);
        if (canEdgeBeTransferred(edge.twin(), face, opType)) {
          EdgeSolveData.setPriority(edge, 10);
        } else {
          invalid.add(edge);
        }
      }
    }
    
    function invalidateEdges(faceA, faceB) {
      for (let edgeA of faceA.edges) {
        if (coincidentEdges.has(edgeA)) {
          continue;
        }
        invalidateEdge(faceB, edgeA); 
      }
    }
    
    for (let edgeA of faceA.edges) {
      for (let edgeB of faceB.edges) {
        checkCoincidentEdges(edgeA, edgeB);
      }
    }

    invalidateEdges(faceA, faceB);
    invalidateEdges(faceB, faceA);
  }
  
  for (let faceA of facesA) {
    for (let faceB of facesB) {
      invalidate(faceA, faceB);
      invalidate(faceB, faceA);
    }
  }

  let graph = new EdgeGraph();
  let discardedEdges = new Set();
  for (let face of originFaces) {
    for (let edge of face.edges) {
      discardedEdges.add(edge);
      if (!invalid.has(edge)) {
        graph.add(edge);
      }
    }
  }

  let detectedLoops = detectLoops(originFace.surface, graph);
  // for (let loop of detectedLoops) {
  //   for (let edge of loop.halfEdges) {
  //     // EdgeSolveData.setPriority(edge, 1);
  //     discardedEdges.delete(edge);
  //   }
  // }


  return {
    mergedLoops: detectedLoops,
    referenceSurface,
    originFaces
  };
}

function markEdgeToReplace(from, to) {
  EDGE_REPLACE.push({from, to});
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
  
  function doesFaceContainNewEdge(face) {
    for (let e of face.edges) {
      if (getPriority(e) > 0 || getPriority(e.twin()) > 0) {
        return true;
      }
    }
    return false;
  }
  
  const resultSet = new Set();
  for (let face of faces) {
    // __DEBUG__.Clear();
    // __DEBUG__.AddFace(face);
    traverseFaces(face, (it) => {
      if (resultSet.has(it) || doesFaceContainNewEdge(it)) {
        resultSet.add(face);
        return true;
      }
    });
  }
  const result = Array.from(resultSet);
  BREP_DEBUG.faceFilter(result, faces);
  return result;
}

function traverseFaces(face, callback) {
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
      for (let halfEdge of loop.halfEdges) {
        let twinFace = halfEdge.twin().loop.face;
        if (twinFace === null) {
          //this happened because there is no face created for a valid and legit detected loop
          throw new CadError('BOOLEAN_INVALID_RESULT', {
            code: 'UNABLE_FACE_EVOLVE', payload: {halfEdge}
          });
          // BREP_DEBUG.markEdge("null face", halfEdge.twin())
        } else {
          stack.push(twinFace);
        }
      }
    }
  }
}

export function loopsToFaces(originFace, loops, out) {
  const newFaces = evolveFace(originFace, loops);
  for (let newFace of newFaces) {
    out.push(newFace);
  }
}

function initSolveData(shell, facesData) {
  for (let face of shell.faces) {
    facesData.push(initSolveDataForFace(face));
  }
}

function initSolveDataForFace(face) {
  const solveData = new FaceSolveData(face);
  if (face.data[MY] !== undefined) {
    Object.assign(solveData, face.data[MY]);
  }
  face.data[MY] = solveData;
  return solveData;
}

function cleanUpSolveData(shell) {
  for (let face of shell.faces) {
    delete face.data[MY];
    for (let he of face.edges) {
      EdgeSolveData.clear(he);
      delete he.edge.data[MY];
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
      return getPriority(e2) - getPriority(e1); 
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
        addIsesc(e1, points.map( ({u0: u, p0: p}) => ({u, p, vertexHolder})  ));
        addIsesc(e2, points.map( ({u1: u, p1: p}) => ({u, p, vertexHolder})  ));
      }
    }
  }
  for (let [e, points] of isecs) {
    points.sort((p1, p2) => p1.u - p2.u);
    for (let {u, vertexHolder} of points ) {
      if (!vertexHolder[0]) {
        vertexHolder[0] = vertexFactory.create(e.curve.point(u));
      }
    }
  }
  for (let [e, points] of isecs) {
    for (let {vertexHolder} of points ) {
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

function intersectFaces(shellA, shellB, operationType) {
  for (let i = 0; i < shellA.faces.length; i++) {
    const faceA = shellA.faces[i];
    if (DEBUG.FACE_FACE_INTERSECTION) {
      __DEBUG__.Clear();
      __DEBUG__.AddFace(faceA, 0x00ff00);
      DEBUG.NOOP();
    }
    for (let j = 0; j < shellB.faces.length; j++) {
      const faceB = shellB.faces[j];
      if (DEBUG.FACE_FACE_INTERSECTION) {
        __DEBUG__.Clear();
        __DEBUG__.AddFace(faceA, 0x00ff00);
        __DEBUG__.AddFace(faceB, 0x0000ff);
        if (faceA.refId === 0 && faceB.refId === 0) {
          DEBUG.NOOP();
        }
      }

      let curves = faceA.surface.intersectSurface(faceB.surface);

      for (let curve of curves) {
        if (DEBUG.FACE_FACE_INTERSECTION) {
          __DEBUG__.AddCurve(curve);
        }
        
        if (hasCoincidentEdge(curve, faceA) || hasCoincidentEdge(curve, faceB)) {
          continue;
        }

        curve = fixCurveDirection(curve, faceA.surface, faceB.surface, operationType);
        const nodes = [];
        collectNodesOfIntersectionOfFace(curve, faceA, nodes, A);
        collectNodesOfIntersectionOfFace(curve, faceB, nodes, B);

        BREP_DEBUG.booleanFaceIntersection(faceA, faceB, curve, nodes);
        
        const newEdges = [];
        split(nodes, curve, newEdges, faceA, faceB);

        newEdges.forEach(e => {
          newEdgeDirectionValidityTest(e, curve);
          addNewEdge(faceA, e.halfEdge1);
          addNewEdge(faceB, e.halfEdge2);
        });
      }
      transferEdges(faceA, faceB, operationType);
      transferEdges(faceB, faceA, operationType);
    }
  }
}

function chooseBetweenEqualEdges(edgeA, edgeB, operationType) {
  let twinA = edgeA.twin();
  let twinB = edgeB.twin();
  
}

function canEdgeBeTransferred(edge, face, operationType) {
  let testPoint = edge.edge.curve.middlePoint();
  let edgeTangent = edge.tangent(testPoint);
  let edgeFaceNormal = edge.loop.face.surface.normal(testPoint);
  let edgeFaceDir = edgeFaceNormal.cross(edgeTangent);
  let faceNormal = face.surface.normal(testPoint);
  let outsideMeasure = edgeFaceDir.dot(faceNormal);

  if (eq(outsideMeasure, 0)) {
    throw 'this case should be considered before calling this method';
    // return undefined;
  }
  
  let outside = outsideMeasure > 0;
  return (operationType === TYPE.INTERSECT) !== outside;
}

export function chooseValidEdge(edge, face, operationType) {
  return canEdgeBeTransferred(edge, face, operationType) ? edge : edge.twin();
}

function transferEdges(faceSource, faceDest, operationType) {
  for (let loop of faceSource.loops) {
    for (let edge of loop.halfEdges) {
      if (isEdgeTransferred(edge.edge)) {
        continue;
      }
      if (edgeCollinearToFace(edge, faceDest)) {
        let validEdge = chooseValidEdge(edge, faceDest, operationType);
        BREP_DEBUG.transferEdge(edge, faceDest, validEdge);
        let twin = validEdge.twin();
        twin.loop.face.data[MY].markTransferredFrom(twin);
        markEdgeTransferred(twin.edge);
        addNewEdge(faceDest, twin);
      }
    }
  }
}

function addNewEdge(face, halfEdge) {
  const data = face.data[MY];
  data.newEdges.push(halfEdge);
  EdgeSolveData.setPriority(halfEdge, 100);
  return true;
}

function nodeByPoint(nodes, point, u, curve, vertex) {
  let node = nodes.find(n => n.point === point);
  if (!node) {
    if (u === undefined) {
      u = curve.param(point);
    }
    node = new Node(point, u, vertex);
    nodes.push(node);
  }
  return node;
}

function hasCoincidentEdge(curve, face) {
  for (let edge of face.edges) {
    if (curveAndEdgeCoincident(curve, edge)) {
      return true;
    }
  }
  return false;
}

function collectNodesOfIntersectionOfFace(curve, face, nodes, operand) {
  for (let loop of face.loops) {
    collectNodesOfIntersection(curve, loop, nodes, operand);
  }
}

function collectNodesOfIntersection(curve, loop, nodes, operand) {
  // __DEBUG__.AddCurve(curve, 0xffffff);
  let skippedEnclosures = new Set();
  
  let encloses = loop.encloses;
  for (let [a, b, v] of encloses) {
    if (skippedEnclosures.has(v)) {
      continue;
    }
    if (curve.passesThrough(v.point)) {
      let classification = isCurveEntersEnclose(curve, a, b);
      if (classification === ENCLOSE_CLASSIFICATION.ENTERS || classification === ENCLOSE_CLASSIFICATION.LEAVES) {
        let node = nodeByPoint(nodes, v.point, undefined, curve, v);
        if (classification === ENCLOSE_CLASSIFICATION.ENTERS) {
          node.enters[operand] = true;
        } else {
          node.leaves[operand] = true;
        }
      }
    }
  }    
  for (let edge of loop.halfEdges) {
    intersectCurveWithEdge(curve, edge, nodes, operand);
  }
}

function intersectCurveWithEdge(curve, edge, nodes, operand) {
  // __DEBUG__.AddCurve(curve, 0xffffff);
  // __DEBUG__.AddHalfEdge(edge, 0xff00ff);
  const points = edge.edge.curve.intersectCurve(curve);
  for (let point of points) {
    const {u0, u1} = point;
    let existing = vertexFactory.find(point.p0);
    if (existing !== null) {
      // vertex already exists, means either we hit an end of edge and this case is handled by enclosure analysis
      // 
      continue;
    }
      
    let node = nodeByPoint(nodes, point.p0, u1, undefined, null);
    if (isCurveEntersEdgeAtPoint(curve, edge, node.point)) {
      node.enters[operand] = true;
    } else {
      node.leaves[operand] = true;
    }
    node.edgeSplitInfo = {edge, u: u0};
    // __DEBUG__.AddVertex(vertex);
  }
}

function split(nodes, curve, result, faceA, faceB) {
  if (nodes.length === 0) {
    return;
  }
  
  nodes.sort((n1, n2) => n1.u - n2.u);

  let initNode = nodes[0];

  // __DEBUG__.Clear();
  // __DEBUG__.AddFace(faceA);
  // __DEBUG__.AddFace(faceB);
  // __DEBUG__.AddCurve(curve);
  
  let insideA = faceA.analysisFace.rayCast(initNode.point).strictInside;
  let insideB = faceB.analysisFace.rayCast(initNode.point).strictInside;
  let inNode = null;
  let edgesToSplits = new Map();
  function checkNodeForEdgeSplit(node) {
    if (node.edgeSplitInfo !== null) {
      addToListInMap(edgesToSplits, node.edgeSplitInfo.edge.edge, node);
    }
  }
  
  for (let node of nodes) {
    let wasInside = insideA && insideB;
    let hadLeft = false; 
    if (node.enters[A] === true) {
      insideA = true;
      inNode = node;
    }
    if (node.leaves[A] === true) {
      insideA = false;
      hadLeft = true;
    }
    if (node.enters[B] === true) {
      insideB = true;
      inNode = node;
    }
    if (node.leaves[B] === true) {
      insideB = false;
      hadLeft = true;
    }
    
    if (wasInside && hadLeft) {
      let edgeCurve = curve;
      let vertexA = inNode.vertex();
      let vertexB = node.vertex();
      if (!ueq(inNode.u, 0)) {
        [,edgeCurve] = edgeCurve.split(vertexA.point);
      }
      if (!ueq(node.u, 1)) {
        [edgeCurve] = edgeCurve.split(vertexB.point);
      }
      const edge = new Edge(edgeCurve, vertexA, vertexB);
      result.push(edge);
      checkNodeForEdgeSplit(inNode);
      checkNodeForEdgeSplit(node);
    }
  }
  
  for (let [edge, nodes] of edgesToSplits) {
    nodes.sort(({edgeSplitInfo:{u}}) => u);
    for (let node of nodes) {
      [,edge] = splitEdgeByVertex(edge, node.vertex());
    }
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
    
    h1.prev = halfEdge.prev;
    h1.prev.next = h1;

    h1.next = h2;
    h2.prev = h1;

    h2.next = halfEdge.next;
    h2.next.prev = h2;
    EdgeSolveData.createIfEmpty(halfEdge).decayed = [h1, h2];
  }
  updateInLoop(edge.halfEdge1, edge1.halfEdge1, edge2.halfEdge1);
  updateInLoop(edge.halfEdge2, edge2.halfEdge2, edge1.halfEdge2);

  function transferPriority(from, to) {
    let priority = getPriority(from);
    if (priority !== 0) {
      EdgeSolveData.setPriority(to, priority);
    }
  }

  transferPriority(edge.halfEdge1, edge1.halfEdge1);
  transferPriority(edge.halfEdge1, edge2.halfEdge1);

  transferPriority(edge.halfEdge2, edge2.halfEdge2);
  transferPriority(edge.halfEdge2, edge1.halfEdge2);

  if (isEdgeTransferred(edge)) {
    markEdgeTransferred(edge1);
    markEdgeTransferred(edge2);
  }
  
  return [edge1, edge2];
}

export function isOnPositiveHalfPlaneFromVec(vec, testee, normal) {
  return vec.cross(testee).dot(normal) > 0;
}

export function isInsideEnclose(normal, testee, inVec, outVec, strict){

  if (strict && veq(outVec, testee)) {
    //TODO: improve error report
    throw new CadError('BOOLEAN_INVALID_RESULT');
  }

  let pivot = inVec.negate();
  if (strict && veq(pivot, testee)) {
    //TODO: improve error report 
    throw new CadError('BOOLEAN_INVALID_RESULT');
  }
  let enclosureAngle = leftTurningMeasure(pivot, outVec, normal);
  let testeeAngle = leftTurningMeasure(pivot, testee, normal);
  return testeeAngle < enclosureAngle;
}


export const ENCLOSE_CLASSIFICATION = {
  UNDEFINED: 0,
  ENTERS: 1,
  LEAVES: 2,
  TANGENTS: 3
};

export function isCurveEntersEnclose(curve, a, b) {
  let pt = a.vertexB.point;
  let normal = a.loop.face.surface.normal(pt);


  let testee = curve.tangentAtPoint(pt);
  let inVec = a.tangentAtEnd();
  let outVec = b.tangentAtStart();

  let coiIn = veqNeg(inVec, testee);
  let coiOut = veq(outVec, testee);

  if (coiIn && coiOut) {
    return ENCLOSE_CLASSIFICATION.UNDEFINED;
  }

  let testeeNeg = testee.negate();

  let coiInNeg = veqNeg(inVec, testeeNeg);
  let coiOutNeg = veq(outVec, testeeNeg);

  if (coiInNeg || coiOutNeg) {
    return ENCLOSE_CLASSIFICATION.UNDEFINED;
  }
  
  let result = ENCLOSE_CLASSIFICATION.UNDEFINED;
  if (coiIn || coiOut) {
    let insideEncloseNeg = isInsideEnclose(normal, testeeNeg, inVec, outVec);
    return insideEncloseNeg ? ENCLOSE_CLASSIFICATION.LEAVES : ENCLOSE_CLASSIFICATION.ENTERS;
  } else {
    let insideEnclose = isInsideEnclose(normal, testee, inVec, outVec);
    let insideEncloseNeg = isInsideEnclose(normal, testeeNeg, inVec, outVec);
    if (insideEnclose === insideEncloseNeg) {
      result = ENCLOSE_CLASSIFICATION.TANGENTS;
    } else {
      result = insideEnclose ? ENCLOSE_CLASSIFICATION.ENTERS : ENCLOSE_CLASSIFICATION.LEAVES;
    }
  }
  return result; 
}

export function isCurveEntersEdgeAtPoint(curve, edge, point) {
  //TODO: revalidate if we need check for tangent equality
  const normal = edge.loop.face.surface.normal(point);
  const edgeTangent = edge.tangent(point);
  const curveTangent = curve.tangentAtPoint(point);

  return isOnPositiveHalfPlaneFromVec(edgeTangent, curveTangent, normal);
}

//TODO: rename to HalfEdgeSolveData
function EdgeSolveData() {
  this.priority = 0;
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

EdgeSolveData.setPriority = function(halfEdge, value) {
  EdgeSolveData.createIfEmpty(halfEdge).priority = value;
};

EdgeSolveData.addPriority = function(halfEdge, value) {
  EdgeSolveData.createIfEmpty(halfEdge).priority += value;
};

function getPriority(edge) {
  return EdgeSolveData.get(edge).priority || 0;
}

function markEdgeTransferred(edge) {
  let data = edge.data[MY];
  if (!data) {
    data = {};
    edge.data[MY] = data;
  }
  data.transfered = true;
}

function isEdgeTransferred(edge) {
  let data = edge.data[MY];
  return data && data.transfered;
}

function Node(point, u, vertex) {
  this.u = u;
  this.point = point;
  this.enters = [false, false];
  this.leaves = [false, false];
  this.edgeSplitInfo = null;
  this._vertex = vertex;
}

Node.prototype.vertex = function() {
  if (!this._vertex) {
    this._vertex = vertexFactory.create(this.point);
  }  
  return this._vertex;
};

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

  create(point, onExistent) {
    let vertex = this.find(point);
    if (vertex === null) {
      vertex = new Vertex(point);
      this.vertices.push(vertex);
    } else if (onExistent !== undefined) {
      return onExistent(vertex);
    }
    return vertex;
  }
}

class SolveData {
  constructor() {
    this.faceData = [];
  }
}

class EdgeGraph {
  constructor() {
    this.vertexToEdge = new Map();
    this.graphEdges = [];
  }
 
  add(he) {
    addToListInMap(this.vertexToEdge, he.vertexA, he);
    this.graphEdges.push(he);
  }
}

class FaceSolveData extends EdgeGraph {
  constructor(face) {
    super();
    this.face = face;
    this.newEdges = [];
    this.errors = [];
  }

  markTransferredFrom(edge) {
    if (!this.transferedFrom) {
      this.transferedFrom = new Set();
    }
    this.transferedFrom.add(edge);
  }

  initGraph() {
    this.vertexToEdge.clear();
    for (let he of this.face.edges) {
      this.addToGraph(he);
    }
    for (let he of this.newEdges) {
      this.addToGraph(he);
    }
  }

  addToGraph(he) {
    // __DEBUG__.Clear();
    // __DEBUG__.AddFace(he.loop.face);
    // __DEBUG__.AddHalfEdge(he, 0xffffff);
    // if (this.isNewOppositeEdge(he)) {
    //   return;
    // }
    if (this.transferedFrom && this.transferedFrom.has(he)) {
      return;
    }
      
    let opp = this.findOppositeEdge(he);
    if (opp) {
      this.errors.push(edgeCollisionError(opp, he));
    }
    
    let list = this.vertexToEdge.get(he.vertexA);
    if (!list) {
      list = [];
      this.vertexToEdge.set(he.vertexA, list);
    } else {
      for (let ex of list) {
        if (he.vertexB === ex.vertexB && isSameEdge(he, ex)) {
          this.errors.push(edgeCollisionError(ex, he));
        //   ex.attachManifold(he);    
        //   return; 
        }          
      }
    }
    list.push(he);
    this.graphEdges.push(he);
  }

  findOppositeEdge(e1) {
    let others = this.vertexToEdge.get(e1.vertexB);
    if (others) {
      for (let e2 of others) {
        if (e1.vertexA === e2.vertexB && isSameEdge(e1, e2)) {
          return e2;
        }
      }
    }
    return null;
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

function edgesHaveSameEnds(e1, e2) {
  let a1 = e1.vertexA;
  let b1 = e1.vertexB;
  let a2 = e2.vertexA;
  let b2 = e2.vertexB;
  return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2) 
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

function curveAndEdgeCoincident(curve, edge) {
  let tess = edge.tessellate();
  //Do reverse to optimize a bit because the first point is usually checked
  let touches = 0;
  for (let i = tess.length - 1; i >= 0; i--) {
    let pt1 = tess[i];
    let pt2 = curve.point(curve.param(pt1));
    if (!veq(pt1, pt2)) {
      if (touches > 1) {
        //partial tangency should be handled before face-face intersection analysis
        throw new CadError('BOOLEAN_INVALID_RESULT', {edge});
      }
      return false;
    }
    touches++;
  }
  return true;
}

function edgeCollinearToFace(edge, face) {
  let tess = edge.tessellate();
  for (let i = 0; i < tess.length; ++i) {
    let pt1 = tess[i];
    let [u, v] = face.surface.param(pt1);
    let pt2 = face.surface.point(u, v);
    if (!veq(pt1, pt2)) {
      return false;
    }
  }
  return face.rayCast(edge.edge.curve.middlePoint()).inside;
}

function edgeCollisionError(e1, e2) {
  return {
    code: 'EDGE_COLLISION', payload: {e1, e2}
  }
}

function checkFaceDataForError(facesData) {
  if (facesData.find(f => f.errors.length !== 0)) {
    let payload = [];    
    for (let faceData of facesData) {
      for (let err of faceData.errors) {
        payload.push(err);
      }
    }
    throw new CadError('BOOLEAN_INVALID_RESULT', payload);
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


function filterInPlace(arr, predicate) {
  for (let i = arr.length - 1; i >= 0; --i) {
    if (!predicate(arr[i])) {
      arr.splice(i, 1)
    }
  }
}

const eq = eqTol;

function assert(name, cond) {
  if (!cond) {
    throw 'ASSERTION FAILED: ' + name;
  }
}

const MY = '__BOOLEAN_ALGORITHM_DATA__'; 
