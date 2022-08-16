import {BREPValidator} from '../brep-validator';
import {Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import {evolveFace} from './evolve-face'
import {eqTol, TOLERANCE, ueq, veq, veqNeg} from 'geom/tolerance';
import CadError from "../../../web/app/utils/errors";
import {createBoundingSurface} from "../brep-builder";
import BREP_DEBUG from '../debug/brep-debug';
import {Face} from "../topo/face";
import {vectorsEqual} from "math/equality";


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
  shell.invert();
}

export function BooleanAlgorithm( shellA, shellB, type ) {
  
  BREP_DEBUG.startBooleanSession(shellA, shellB, type);

  shellA = prepareWorkingCopy(shellA);
  shellB = prepareWorkingCopy(shellB);
  
  BREP_DEBUG.setBooleanWorkingOperands(shellA, shellB);

  if (type === TYPE.SUBTRACT) {
    invert(shellB);
    type = TYPE.INTERSECT;
  }

  const workingFaces = collectFaces(shellA, shellB);

  initOperationData(workingFaces);

  mergeVertices(shellA, shellB);
  initVertexFactory(shellA, shellB);

  intersectEdges(shellA, shellB);
  const mergedFaces = mergeOverlappingFaces(shellA, shellB, type);

  intersectFaces(shellA, shellB, type);

  replaceMergedFaces(workingFaces, mergedFaces);
  for (const workingFace of workingFaces) {
    workingFace.op.initGraph();
  }
  
  checkFaceDataForError(workingFaces);
  
  for (const face of workingFaces) {
    face.op.detectedLoops = detectLoops(face.surface, face.op);
  }
  
  for (const face of workingFaces) {
    for (const loop of face.op.detectedLoops) {
      loop.link();
    }
  }
  
  removeInvalidLoops(workingFaces);
  
  let faces = [];
  
  for (const face of workingFaces) {
    loopsToFaces(face, face.op.detectedLoops, faces);
  }

  faces = filterFaces(faces);
  
  const result = new Shell();
  faces.forEach(face => {
    face.shell = result;
    result.faces.push(face);
  });

  cleanUpOperationData(result);
  BREPValidator.validateToConsole(result);

  // __DEBUG__.ClearVolumes();
  // __DEBUG__.Clear();
  BREP_DEBUG.setBooleanResult(result);
  return result;
}

function removeInvalidLoops(faces) {
  const detectedLoopsSet = new Set();
  for (const face of faces) {
    for (const loop of face.op.detectedLoops) {
      detectedLoopsSet.add(loop);
    }
  }

  function isLoopInvalid(loop) {
    //discarded by face merge routine || has reference to not reassembled loop 
    return !detectedLoopsSet.has(loop);
  }
  
  for (const face of faces) {
    face.op.detectedLoops = face.op.detectedLoops.filter(
      loop => loop.halfEdges.find(e => isLoopInvalid(e.twin().loop)) === undefined);
  }
}

function replaceMergedFaces(workingFaces, mergedFaces) {
  function addDecayed(he, out) {
    const decayed = EdgeSolveData.get(he).decayed;
    if (decayed) {
      decayed.forEach(de => addDecayed(de, out));
    } else {
      out.push(he);
    }
  }
  filterInPlace(workingFaces, face => 
      mergedFaces.find(({originFaces}) => originFaces.indexOf(face) > -1) === undefined
  );
  for (const {facePrototypes, originFaces} of mergedFaces) {
    for (const {loops, surface} of facePrototypes) {
      const fakeFace = new Face(surface);
      for (const loop of loops) {
        const actualHalfEdges = [];
        loop.halfEdges.forEach(he => addDecayed(he, actualHalfEdges));
        loop.halfEdges = actualHalfEdges;
        fakeFace.innerLoops.push(loop);
        loop.face = fakeFace;
        loop.link();
      }
      initOperationDataForFace(fakeFace);
      workingFaces.push(fakeFace);
      for (const originFace of originFaces) {
        originFace.op.newEdges.forEach(e => addNewEdge(fakeFace, e));
      }
    }
  }
}

function prepareWorkingCopy(_shell) {
  const workingCopy = _shell.clone();
  setAnalysisFace(_shell, workingCopy);
  cleanUpOperationData(workingCopy);
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
  for (;;) {
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
      candidates = candidates.filter(c => c.vertexB !== edge.vertexA || !isSameEdge(c, edge));
      edge = findMaxTurningLeft(edge, candidates, surface);
      BREP_DEBUG.booleanLoopDetectionNextStep(candidates, edge);
      if (seen.has(edge)) {
        break;
      }
    }
  }
  return loops;
}


function findOverlappingFaces(shellA, shellB) {

  function overlapsImpl(face1, face2) {
    function pointOnFace(face, pt) {
      return face.env2D().pip(face.surface.workingPoint(pt)).inside;
    }
    for (const e1 of face1.edges) {
      if (pointOnFace(face2, e1.vertexA.point)) {
        return true;    
      }
    }
  }

  function overlaps(face1, face2) {
    const ss1 = face1.surface.simpleSurface; 
    const ss2 = face2.surface.simpleSurface; 
    if (ss1 !== null && ss2 !== null && ss1.TYPE === 'plane' && ss1.TYPE === ss2.TYPE && 
        ss1.coplanarUnsigned(ss2)) {
      return overlapsImpl(face1, face2) || overlapsImpl(face2, face1);        
    }
    return false;  
  }

  const overlapGroups = [];

  for (const faceA of shellA.faces) {
    for (const faceB of shellB.faces) {
      if (DEBUG.FACE_MERGE) {
        __DEBUG__.Clear();
        __DEBUG__.AddFace(faceA, 0x0000ff);
        __DEBUG__.AddFace(faceB);
      }
      if (overlaps(faceA, faceB) ) {
        let group = overlapGroups.find(g => g[0].has(faceA) || g[1].has(faceB));
        if (!group) {
          group = [new Set(), new Set()];    
          overlapGroups.push(group);
        } 
        group[A].add(faceA);
        group[B].add(faceB);
        faceA.op.overlaps = group[B];
        faceB.op.overlaps = group[A];
      }
    }
  }
  return overlapGroups;
}

function mergeOverlappingFaces(shellA, shellB, opType) {
  const groups = findOverlappingFaces(shellA, shellB);
  BREP_DEBUG.setOverlappingFaces(groups);
  const mergedFaces = [];
  for (const [groupA, groupB] of groups) {
    const faceMergeInfo = mergeFaces(Array.from(groupA), Array.from(groupB), opType);
    mergedFaces.push(faceMergeInfo);
  }
  return mergedFaces;
}

function mergeFaces(facesA, facesB, opType) {
  const originFaces = [...facesA, ...facesB];
  const allPoints = [];

  for (const face of originFaces) {
    for (const e of face.edges) {
      allPoints.push(e.vertexA.point);
    }
  }

  const valid = new Set();
  const invalid = new Set();
  
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
    
    const coincidentEdges = new Set();
    
    function checkCoincidentEdges(edgeA, edgeB) {
      if (isSameEdge(edgeA, edgeB)) {
        EdgeSolveData.markCollision(edgeA, edgeB);
        coincidentEdges.add(edgeA);
        coincidentEdges.add(edgeB);
        markEdgeTransferred(edgeA.edge);
        markEdgeTransferred(edgeB.edge);
        if (edgeA.vertexA === edgeB.vertexA) {
          // chooseBetweenEqualEdges();
          // canEdgeBeTransferred(edge, face, opType)
          const faceAAdjacent = edgeA.twin().loop.face;
          const faceBAdjacent = edgeB.twin().loop.face;
          if (faceAAdjacent.op.overlaps && faceAAdjacent.op.overlaps.has(faceBAdjacent)) {
            invalid.add(edgeB);
          } else {
            throw new CadError({
              kind: CadError.KIND.UNSUPPORTED_CASE,
              code: 'edge collision on face merge',
              relatedTopoObjects: [edgeA, edgeB],
              userMessage: "edges can't be coincident for this operation"
            });
          }
        } else if (edgeA.vertexA === edgeB.vertexB) {

          invalid.add(edgeA);
          invalid.add(edgeB);
          // markEdgeToReplace(testee, edge.twin());
        } 
      }  
    }


    function invalidateEdge(face, edge) {
      const pt = edge.edge.curve.middlePoint();
      if (face.rayCast(pt).inside) {
        markEdgeTransferred(edge.edge);
        if (canEdgeBeTransferred(edge.twin(), face, opType)) {
          EdgeSolveData.setPriority(edge, 10);
        } else {
          invalid.add(edge);
        }
      }
    }
    
    function invalidateEdges(faceX, faceY) {
      for (const edgeX of faceX.edges) {
        if (coincidentEdges.has(edgeX)) {
          continue;
        }
        invalidateEdge(faceY, edgeX); 
      }
    }
    
    for (const edgeA of faceA.edges) {
      for (const edgeB of faceB.edges) {
        checkCoincidentEdges(edgeA, edgeB);
      }
    }

    invalidateEdges(faceA, faceB);
    invalidateEdges(faceB, faceA);
  }
  
  for (const faceA of facesA) {
    for (const faceB of facesB) {
      invalidate(faceA, faceB);
    }
  }


  
  const facePrototypes = [];
  let leftovers = null;
  for (const referenceFace of originFaces) {

    const graph = new EdgeGraph();
    for (const face of originFaces) {
      for (const edge of face.edges) {
        if (!invalid.has(edge) && (leftovers == null || leftovers.has(edge))) {
          graph.add(edge);
        }
      }
    }

    leftovers = new Set(graph.graphEdges);
    const detectedLoops = detectLoops(referenceFace.surface, graph);

    for (const loop of detectedLoops) {
      for (const edge of loop.halfEdges) {
        // EdgeSolveData.setPriority(edge, 1);
        leftovers.delete(edge);
      }
    }


    if (detectedLoops.length !== 0) {
      facePrototypes.push({
        loops: detectedLoops,
        surface: createBoundingSurface(allPoints, referenceFace.surface.simpleSurface),
      });
    }
  }

  return {
    facePrototypes,
    originFaces
  };
}

export function mergeVertices(shell1, shell2) {
  const toSwap = new Map();
  for (const v1 of shell1.vertices) {
    for (const v2 of shell2.vertices) {
      if (veq(v1.point, v2.point)) {
        toSwap.set(v2, v1);
      }
    }
  }

  for (const face of shell2.faces) {
    for (const h of face.edges) {
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
    for (const e of face.edges) {
      if (getPriority(e) > 0 || getPriority(e.twin()) > 0 || 
          EdgeSolveData.get(e).affected === true) {
        return true;
      }
    }
    return false;
  }
  
  const resultSet = new Set();
  for (const face of faces) {
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
    for (const loop of face.loops) {
      for (const halfEdge of loop.halfEdges) {
        const twinFace = halfEdge.twin().loop.face;
        if (twinFace === null) {
          //this happened because there is no face created for a valid and legit detected loop
          throw new CadError({
            kind: CadError.KIND.INTERNAL_ERROR,
            relatedTopoObjects: [halfEdge]
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
  for (const newFace of newFaces) {
    out.push(newFace);
  }
}

function collectFaces(shellA, shellB) {
  function collect(shell, out) {
    for (const face of shell.faces) {
      out.push(face);
    }
  }
  const out = [];
  collect(shellA, out);
  collect(shellB, out);
  return out;
}

function initOperationData(faces) {
  for (const face of faces) {
    initOperationDataForFace(face);
  }
}

function initOperationDataForFace(face) {
  face.op = new FaceOperationData(face);
}

function cleanUpOperationData(shell) {
  for (const face of shell.faces) {
    face.op = null;
    for (const he of face.edges) {
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
    const delta = leftTurningMeasure(pivot, edgeVector(e1), normal) - leftTurningMeasure(pivot, edgeVector(e2), normal);
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
  const isecs = new Map();
  function addIsesc(e, params) {
    const allParams = isecs.get(e);
    if (!allParams) {
      isecs.set(e, params);
    } else {
      params.forEach(p => allParams.push(p));
    }
  }
  for (const e1 of shell1.edges) {
    for (const e2 of shell2.edges) {
      const points = e1.curve.intersectCurve(e2.curve, TOLERANCE);
      if (points.length !== 0) {
        const vertexHolder = [];
        addIsesc(e1, points.map( ({u0: u, p0: p}) => ({u, p, vertexHolder})  ));
        addIsesc(e2, points.map( ({u1: u, p1: p}) => ({u, p, vertexHolder})  ));
      }
    }
  }
  for (const [e, points] of isecs) {
    points.sort((p1, p2) => p1.u - p2.u);
    for (const {u, vertexHolder} of points ) {
      if (!vertexHolder[0]) {
        vertexHolder[0] = vertexFactory.create(e.curve.point(u));
      }
    }
  }
  for (let [e, points] of isecs) {
    for (const {vertexHolder} of points ) {
      const split = splitEdgeByVertex(e, vertexHolder[0]);
      if (split !== null) {
        e = split[1];
      }
    }
  }
}

function fixCurveDirection(curve, surface1, surface2, operationType) {
  const point = curve.middlePoint();
  const tangent = curve.tangentAtPoint(point);
  const normal1 = surface1.normal(point);
  const normal2 = surface2.normal(point);

  const expectedDirection = normal1.cross(normal2);

  if (operationType === TYPE.UNION) {
    expectedDirection._negate();
  }
  const sameAsExpected = expectedDirection.dot(tangent) > 0;
  if (!sameAsExpected) {
    curve = curve.invert();
  }
  return curve;
}

//TODO: extract to a unit test
function newEdgeDirectionValidityTest(e, curve) {
  const point = e.halfEdge1.vertexA.point;
  const tangent = curve.tangentAtPoint(point);
  assert('tangent of originated curve and first halfEdge should be the same', vectorsEqual(tangent, e.halfEdge1.tangent(point)));
  assert('tangent of originated curve and second halfEdge should be the opposite', vectorsEqual(tangent._negate(), e.halfEdge2.tangent(point)));
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

      const curves = faceA.surface.intersectSurface(faceB.surface);

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
  const twinA = edgeA.twin();
  const twinB = edgeB.twin();
  
}

function canEdgeBeTransferred(edge, face, operationType) {
  const testPoint = edge.edge.curve.middlePoint();
  const edgeTangent = edge.tangent(testPoint);
  const edgeFaceNormal = edge.loop.face.surface.normal(testPoint);
  const edgeFaceDir = edgeFaceNormal.cross(edgeTangent);
  const faceNormal = face.surface.normal(testPoint);
  const outsideMeasure = edgeFaceDir.dot(faceNormal);

  if (eq(outsideMeasure, 0)) {
    throw 'this case should be considered before calling this method';
    // return undefined;
  }
  
  const outside = outsideMeasure > 0;
  return (operationType === TYPE.INTERSECT) !== outside;
}

export function chooseValidEdge(edge, face, operationType) {
  return canEdgeBeTransferred(edge, face, operationType) ? edge : edge.twin();
}

function transferEdges(faceSource, faceDest, operationType) {
  for (const loop of faceSource.loops) {
    for (const edge of loop.halfEdges) {
      if (isEdgeTransferred(edge.edge)) {
        continue;
      }
      if (edgeCollinearToFace(edge, faceDest)) {
        const validEdge = chooseValidEdge(edge, faceDest, operationType);
        BREP_DEBUG.transferEdge(edge, faceDest, validEdge);
        const twin = validEdge.twin();
        twin.loop.face.op.markTransferredFrom(twin);
        markEdgeTransferred(twin.edge);
        addNewEdge(faceDest, twin);
      }
    }
  }
}

function addNewEdge(face, halfEdge) {
  face.op.newEdges.push(halfEdge);
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
  for (const edge of face.edges) {
    if (curveAndEdgeCoincident(curve, edge)) {
      return true;
    }
  }
  return false;
}

function collectNodesOfIntersectionOfFace(curve, face, nodes, operand) {
  for (const loop of face.loops) {
    collectNodesOfIntersection(curve, loop, nodes, operand);
  }
}

function collectNodesOfIntersection(curve, loop, nodes, operand) {
  // __DEBUG__.AddCurve(curve, 0xffffff);
  const skippedEnclosures = new Set();
  
  const encloses = loop.encloses;
  for (const [a, b, v] of encloses) {
    if (skippedEnclosures.has(v)) {
      continue;
    }
    if (curve.passesThrough(v.point)) {
      const classification = isCurveEntersEnclose(curve, a, b);
      if (classification === ENCLOSE_CLASSIFICATION.ENTERS || classification === ENCLOSE_CLASSIFICATION.LEAVES) {
        const node = nodeByPoint(nodes, v.point, undefined, curve, v);
        if (classification === ENCLOSE_CLASSIFICATION.ENTERS) {
          node.enters[operand] = true;
        } else {
          node.leaves[operand] = true;
        }
      }
    }
  }    
  for (const edge of loop.halfEdges) {
    intersectCurveWithEdge(curve, edge, nodes, operand);
  }
}

function intersectCurveWithEdge(curve, edge, nodes, operand) {
  // __DEBUG__.AddCurve(curve, 0xffffff);
  // __DEBUG__.AddHalfEdge(edge, 0xff00ff);
  const points = edge.edge.curve.intersectCurve(curve);
  for (const point of points) {
    const {u0, u1} = point;
    const existing = vertexFactory.find(point.p0);
    if (existing !== null) {
      // vertex already exists, means either we hit an end of edge and this case is handled by enclosure analysis
      // 
      continue;
    }
      
    const node = nodeByPoint(nodes, point.p0, u1, undefined, null);
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

  const initNode = nodes[0];

  // __DEBUG__.Clear();
  // __DEBUG__.AddFace(faceA);
  // __DEBUG__.AddFace(faceB);
  // __DEBUG__.AddCurve(curve);
  
  let insideA = faceA.analysisFace.rayCast(initNode.point).strictInside;
  let insideB = faceB.analysisFace.rayCast(initNode.point).strictInside;
  let inNode = null;
  const edgesToSplits = new Map();
  function checkNodeForEdgeSplit(node) {
    if (node.edgeSplitInfo !== null) {
      addToListInMap(edgesToSplits, node.edgeSplitInfo.edge.edge, node);
    }
  }
  
  for (const node of nodes) {
    const wasInside = insideA && insideB;
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
      const vertexA = inNode.vertex();
      const vertexB = node.vertex();
      if (!ueq(inNode.u, curve.uMin)) {
        [,edgeCurve] = edgeCurve.split(vertexA.point);
      }
      if (!ueq(node.u, curve.uMax)) {
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
    for (const node of nodes) {
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
    const halfEdges = halfEdge.loop.halfEdges;
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
    const priority = getPriority(from);
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
    throw new CadError({
      relatedTopoObjects: [testee]
    });
  }

  const pivot = inVec.negate();
  if (strict && veq(pivot, testee)) {
    //TODO: improve error report 
    throw new CadError({
      relatedTopoObjects: [testee]
    });
  }
  const enclosureAngle = leftTurningMeasure(pivot, outVec, normal);
  const testeeAngle = leftTurningMeasure(pivot, testee, normal);
  return testeeAngle < enclosureAngle;
}


export const ENCLOSE_CLASSIFICATION = {
  UNDEFINED: 0,
  ENTERS: 1,
  LEAVES: 2,
  TANGENTS: 3
};

export function isCurveEntersEnclose(curve, a, b) {
  const pt = a.vertexB.point;
  const normal = a.loop.face.surface.normal(pt);


  const testee = curve.tangentAtPoint(pt);
  const inVec = a.tangentAtEnd();
  const outVec = b.tangentAtStart();

  const coiIn = veqNeg(inVec, testee);
  const coiOut = veq(outVec, testee);

  if (coiIn && coiOut) {
    return ENCLOSE_CLASSIFICATION.UNDEFINED;
  }

  const testeeNeg = testee.negate();

  const coiInNeg = veqNeg(inVec, testeeNeg);
  const coiOutNeg = veq(outVec, testeeNeg);

  if (coiInNeg || coiOutNeg) {
    return ENCLOSE_CLASSIFICATION.UNDEFINED;
  }
  
  let result = ENCLOSE_CLASSIFICATION.UNDEFINED;
  if (coiIn || coiOut) {
    const insideEncloseNeg = isInsideEnclose(normal, testeeNeg, inVec, outVec);
    return insideEncloseNeg ? ENCLOSE_CLASSIFICATION.LEAVES : ENCLOSE_CLASSIFICATION.ENTERS;
  } else {
    const insideEnclose = isInsideEnclose(normal, testee, inVec, outVec);
    const insideEncloseNeg = isInsideEnclose(normal, testeeNeg, inVec, outVec);
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

EdgeSolveData.markAffected = function(halfEdge) {
  EdgeSolveData.createIfEmpty(halfEdge).affected = true;
};

EdgeSolveData.markCollision = function(halfEdge1, halfEdge2) {
  
  function markNeighborhoodAffected(edge) {
    EdgeSolveData.markAffected(edge);
    EdgeSolveData.markAffected(edge.next);
    EdgeSolveData.markAffected(edge.prev);
  }
  markNeighborhoodAffected(halfEdge1);
  markNeighborhoodAffected(halfEdge2);
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
  const data = edge.data[MY];
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
    for (const v of vertices) {
      this.vertices.push(v);
    }
  }

  find(point) {
    for (const vertex of this.vertices) {
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

export class EdgeGraph {
  constructor() {
    this.vertexToEdge = new Map();
    this.graphEdges = [];
  }
 
  add(he) {
    addToListInMap(this.vertexToEdge, he.vertexA, he);
    this.graphEdges.push(he);
  }
}

class FaceOperationData extends EdgeGraph {
  constructor(face) {
    super();
    this.face = face;
    this.newEdges = [];
    this.collidedEdges = [];
    this.overlaps = null;
  }

  markTransferredFrom(edge) {
    if (!this.transferedFrom) {
      this.transferedFrom = new Set();
    }
    this.transferedFrom.add(edge);
  }

  initGraph() {
    this.vertexToEdge.clear();
    for (const he of this.face.edges) {
      this.addToGraph(he);
    }
    for (const he of this.newEdges) {
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
      
    const opp = this.findOppositeEdge(he);
    if (opp) {
      this.collidedEdges.push(opp, he);
    }
    
    let list = this.vertexToEdge.get(he.vertexA);
    if (!list) {
      list = [];
      this.vertexToEdge.set(he.vertexA, list);
    } else {
      for (const ex of list) {
        if (he.vertexB === ex.vertexB && isSameEdge(he, ex)) {
          this.collidedEdges.push(ex, he);
        //   ex.attachManifold(he);    
        //   return; 
        }          
      }
    }
    list.push(he);
    this.graphEdges.push(he);
  }

  findOppositeEdge(e1) {
    const others = this.vertexToEdge.get(e1.vertexB);
    if (others) {
      for (const e2 of others) {
        if (e1.vertexA === e2.vertexB && isSameEdge(e1, e2)) {
          return e2;
        }
      }
    }
    return null;
  }
}

function removeFromListInMap(map, key, value) {
  const list = map.get(key);
  if (list) {
    const idx = list.indexOf(value);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }
}

function edgesHaveSameEnds(e1, e2) {
  const a1 = e1.vertexA;
  const b1 = e1.vertexB;
  const a2 = e2.vertexA;
  const b2 = e2.vertexB;
  return (a1 === a2 && b1 === b2) || (a1 === b2 && b1 === a2) 
}

function isSameEdge(e1, e2) {
  const tess = e1.tessellate();
  for (const pt1 of tess) {
    const pt2 = e2.edge.curve.point(e2.edge.curve.param(pt1));
    if (!veq(pt1, pt2)) {
      return false;
    }
  }
  return true;
}

function curveAndEdgeCoincident(curve, edge) {
  const tess = edge.tessellate();
  //Do reverse to optimize a bit because the first point is usually checked
  let touches = 0;
  for (let i = tess.length - 1; i >= 0; i--) {
    const pt1 = tess[i];
    const pt2 = curve.point(curve.param(pt1));
    if (!veq(pt1, pt2)) {
      if (touches > 1) {
        //partial tangency should be handled before face-face intersection analysis
        throw new CadError({
          kind: CadError.KIND.INVALID_INPUT,
          code: 'edge partial tangency',
          relatedTopoObjects: [edge]
        });
      }
      return false;
    }
    touches++;
  }
  return true;
}

function edgeCollinearToFace(edge, face) {
  const tess = edge.tessellate();
  for (let i = 0; i < tess.length; ++i) {
    const pt1 = tess[i];
    const [u, v] = face.surface.param(pt1);
    const pt2 = face.surface.point(u, v);
    if (!veq(pt1, pt2)) {
      return false;
    }
  }
  return face.rayCast(edge.edge.curve.middlePoint()).inside;
}

function checkFaceDataForError(workingFaces) {
  if (workingFaces.find(f => f.op.collidedEdges.length !== 0)) {
    const relatedTopoObjects = [];    
    for (const face of workingFaces) {
      for (const err of face.op.collidedEdges) {
        relatedTopoObjects.push(err);
      }
    }
    throw new CadError({
      kind: CadError.KIND.INVALID_INPUT,
      relatedTopoObjects,
      userMessage: 'unable to process coincident edges for this operation type'
    });
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
