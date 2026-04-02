import {BREPValidator} from '../brep-validator';
import {Edge} from '../topo/edge';
import {Loop} from '../topo/loop';
import {Shell} from '../topo/shell';
import {Vertex} from '../topo/vertex';
import {evolveFace} from './evolve-face';
import {eqTol, TOLERANCE, ueq, veq, veqNeg} from 'geom/tolerance';
import CadError from "../../../web/app/utils/errors";
import {createBoundingSurface} from "../brep-builder";
import BREP_DEBUG from '../debug/brep-debug';


// ============================================================================
// Public API
// ============================================================================

const TYPE = {
  UNION: 'UNION',
  INTERSECT: 'INTERSECT',
  SUBTRACT: 'SUBTRACT'
};

export function union(shell1, shell2) {
  return BooleanAlgorithm(shell1, shell2, TYPE.UNION);
}

export function intersect(shell1, shell2) {
  return BooleanAlgorithm(shell1, shell2, TYPE.INTERSECT);
}

export function subtract(shell1, shell2) {
  return BooleanAlgorithm(shell1, shell2, TYPE.SUBTRACT);
}

export function invert(shell) {
  shell.invert();
}

// ============================================================================
// Phase 1: Main Algorithm Entry Point
// ============================================================================

export function BooleanAlgorithm(shellA, shellB, type) {

  BREP_DEBUG.startBooleanSession(shellA, shellB, type);

  shellA = prepareWorkingCopy(shellA);
  shellB = prepareWorkingCopy(shellB);

  BREP_DEBUG.setBooleanWorkingOperands(shellA, shellB);

  if (type === TYPE.SUBTRACT) {
    invert(shellB);
    type = TYPE.INTERSECT;
  }

  mergeVertices(shellA, shellB);
  const vFactory = new VertexFactory();
  vFactory.addVertices(shellA.vertices);
  vFactory.addVertices(shellB.vertices);

  // Phase 2: Compute all intersection curves and split edges at edge-edge intersections
  // Coplanar face edges are injected as intersection curves into the main pipeline
  const intersectionData = computeAllIntersections(shellA, shellB, vFactory);

  console.log('=== BOOLEAN DEBUG ===');
  console.log('Type:', type);
  console.log('ShellA faces:', shellA.faces.length);
  console.log('ShellB faces:', shellB.faces.length);
  console.log('Curves per face entries:', intersectionData.curvesPerFace.size);
  for (const [face, curves] of intersectionData.curvesPerFace) {
    const shellLabel = shellA.faces.indexOf(face) >= 0 ? 'A' : 'B';
    const faceIdx = shellLabel === 'A' ? shellA.faces.indexOf(face) : shellB.faces.indexOf(face);
    console.log(`  Face ${shellLabel}[${faceIdx}]: ${curves.length} curves`);
  }

  // Phase 3: Split faces along intersection curves into fragments
  const fragmentsA = splitAllFaces(shellA, intersectionData.curvesPerFace, vFactory);
  const fragmentsB = splitAllFaces(shellB, intersectionData.curvesPerFace, vFactory);

  console.log('FragmentsA:', fragmentsA.length, '(from', shellA.faces.length, 'faces)');
  console.log('FragmentsB:', fragmentsB.length, '(from', shellB.faces.length, 'faces)');

  // Phase 4: Classify each fragment as IN or OUT relative to the other solid
  classifyFragments(fragmentsA, shellB);
  classifyFragments(fragmentsB, shellA);

  for (const f of fragmentsA) {
    console.log(`  FragA: ${f.classification}, hasNew=${f.hasNewEdges}, edges=${[...f.face.edges].length}`);
  }
  for (const f of fragmentsB) {
    console.log(`  FragB: ${f.classification}, hasNew=${f.hasNewEdges}, edges=${[...f.face.edges].length}`);
  }

  // Phase 5: Select fragments based on operation type
  const selectedA = selectFragments(fragmentsA, type);
  const selectedB = selectFragments(fragmentsB, type);

  console.log('SelectedA:', selectedA.length, 'SelectedB:', selectedB.length);
  console.log('=== END DEBUG ===');

  // Phase 6: Assemble result shell
  const allSelected = [...selectedA, ...selectedB];
  const result = assembleResult(allSelected);

  BREPValidator.validateToConsole(result);
  BREP_DEBUG.setBooleanResult(result);

  return result;
}

function prepareWorkingCopy(_shell) {
  const workingCopy = _shell.clone();
  setAnalysisFace(_shell, workingCopy);
  return workingCopy;
}

function setAnalysisFace(originShell, clonedShell) {
  for (let i = 0; i < originShell.faces.length; ++i) {
    clonedShell.faces[i].analysisFace = originShell.faces[i];
  }
}

// ============================================================================
// Phase 2: Compute All Intersections
// ============================================================================

function computeAllIntersections(shellA, shellB, vFactory) {
  const curvesPerFace = new Map(); // Face -> Array<{curve, otherFace}>
  const edgeSplits = new Map(); // Edge -> Array<{u, vertex}>

  // 2A: Surface-surface intersection curves
  for (const faceA of shellA.faces) {
    for (const faceB of shellB.faces) {
      if (areFacesCoplanar(faceA, faceB)) {
        // Coplanar faces: inject edges of one face as cutting curves for the other.
        // This feeds coplanar handling into the normal splitting pipeline.
        injectCoplanarEdgesAsCurves(faceA, faceB, curvesPerFace);
        continue;
      }

      const curves = faceA.surface.intersectSurface(faceB.surface);
      for (const curve of curves) {
        if (isCurveTooShort(curve)) continue;

        // Check coincidence PER FACE — a curve that coincides with an edge of
        // face B can still be a valid cutting curve for face A, and vice versa.
        // Example: intersection of bigBox top with smallBox side produces a line
        // that IS the top edge of smallBox's side face but cuts through bigBox's
        // top face interior.
        const coincidentA = hasCoincidentEdge(curve, faceA);
        const coincidentB = hasCoincidentEdge(curve, faceB);

        if (!coincidentA) {
          addToListInMap(curvesPerFace, faceA, {curve, otherFace: faceB});
        }
        if (!coincidentB) {
          addToListInMap(curvesPerFace, faceB, {curve: curve.invert(), otherFace: faceA});
        }
      }
    }
  }

  // 2B: Edge-edge intersections — split edges at crossing points
  for (const e1 of shellA.edges) {
    for (const e2 of shellB.edges) {
      const points = e1.curve.intersectCurve(e2.curve, TOLERANCE);
      if (points.length !== 0) {
        const vertexHolder = [];
        for (const {u0, u1} of points) {
          if (!vertexHolder[0]) {
            vertexHolder[0] = vFactory.create(e1.curve.point(u0));
          }
          addToListInMap(edgeSplits, e1, {u: u0, vertex: vertexHolder[0]});
          addToListInMap(edgeSplits, e2, {u: u1, vertex: vertexHolder[0]});
        }
      }
    }
  }

  // Apply edge splits
  for (let [edge, splits] of edgeSplits) {
    splits.sort((a, b) => a.u - b.u);
    for (const {vertex} of splits) {
      const result = splitEdgeByVertex(edge, vertex);
      if (result !== null) {
        edge = result[1];
      }
    }
  }

  return {curvesPerFace};
}

function injectCoplanarEdgesAsCurves(faceA, faceB, curvesPerFace) {
  // For coplanar face pairs, the edges of one face become the cutting curves
  // for the other face. This handles shared/overlapping planar faces through
  // the standard face-splitting pipeline instead of a separate code path.
  //
  // Edges that are coincident (shared between both faces) are automatically
  // skipped by hasCoincidentEdge checks in trimCurveToFace.

  for (const he of faceB.edges) {
    const curve = he.edge.curve;
    // Skip if this edge coincides with an existing edge on faceA
    if (!hasCoincidentEdge(curve, faceA)) {
      addToListInMap(curvesPerFace, faceA, {curve, otherFace: faceB});
    }
  }

  for (const he of faceA.edges) {
    const curve = he.edge.curve;
    if (!hasCoincidentEdge(curve, faceB)) {
      addToListInMap(curvesPerFace, faceB, {curve, otherFace: faceA});
    }
  }
}

function areFacesCoplanar(face1, face2) {
  const ss1 = face1.surface.simpleSurface;
  const ss2 = face2.surface.simpleSurface;
  if (ss1 !== null && ss2 !== null && ss1.TYPE === 'plane' && ss2.TYPE === 'plane') {
    return ss1.coplanarUnsigned(ss2);
  }
  return false;
}

function isCurveTooShort(curve) {
  try {
    const start = curve.startPoint();
    const end = curve.endPoint();
    return veq(start, end) && veq(start, curve.middlePoint());
  } catch (e) {
    return true;
  }
}

function hasCoincidentEdge(curve, face) {
  for (const edge of face.edges) {
    if (curveAndEdgeCoincident(curve, edge)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Phase 3: Face Splitting
// ============================================================================

function splitAllFaces(shell, curvesPerFace, vFactory) {
  const fragments = [];

  for (const face of shell.faces) {
    const curveInfos = curvesPerFace.get(face);

    if (!curveInfos || curveInfos.length === 0) {
      // No intersection curves — face is a single fragment
      fragments.push(new FaceFragment(face, face, shell));
      continue;
    }

    // Find all trimmed curve segments that lie inside this face
    const trimmedSegments = [];
    for (const {curve} of curveInfos) {
      const segments = trimCurveToFace(curve, face, vFactory);
      for (const seg of segments) {
        trimmedSegments.push(seg);
      }
    }

    if (trimmedSegments.length === 0) {
      fragments.push(new FaceFragment(face, face, shell));
      continue;
    }

    // Split face boundary edges at curve entry/exit points
    for (const seg of trimmedSegments) {
      splitBoundaryAtVertex(face, seg.startVertex, vFactory);
      splitBoundaryAtVertex(face, seg.endVertex, vFactory);
    }

    // Create new edges along the trimmed intersection curves
    const newEdges = [];
    for (const seg of trimmedSegments) {
      const edge = new Edge(seg.curve, seg.startVertex, seg.endVertex);
      newEdges.push(edge);
    }

    // Build graph and detect loops to split face into fragments
    const detectedLoops = detectFaceLoops(face, newEdges);

    if (detectedLoops.length === 0) {
      // Loop detection failed — keep original face
      fragments.push(new FaceFragment(face, face, shell));
      continue;
    }

    // Link loops and convert to faces
    for (const loop of detectedLoops) {
      loop.link();
    }

    const newFaces = evolveFace(face, detectedLoops);
    for (const newFace of newFaces) {
      const frag = new FaceFragment(newFace, face, shell);
      frag.hasNewEdges = newEdges.length > 0;
      fragments.push(frag);
    }
  }

  return fragments;
}

function trimCurveToFace(curve, face, vFactory) {
  // Find all points where the curve crosses the face boundary
  const crossings = [];

  for (const he of face.edges) {
    const isecs = he.edge.curve.intersectCurve(curve);
    for (const isec of isecs) {
      const existingVertex = vFactory.find(isec.p0);
      if (existingVertex !== null) {
        // This intersection point is at an existing vertex —
        // already handled by vertex merging / enclosure analysis
        continue;
      }
      crossings.push({
        point: isec.p0,
        curveParam: isec.u1,
        edgeParam: isec.u0,
        halfEdge: he,
      });
    }
  }

  // Also check if curve endpoints are on the face boundary (at existing vertices)
  for (const [,, v] of face.outerLoop.encloses) {
    if (curve.passesThrough(v.point)) {
      crossings.push({
        point: v.point,
        curveParam: curve.param(v.point),
        edgeParam: null,
        halfEdge: null,
        vertex: v
      });
    }
  }
  for (const innerLoop of face.innerLoops) {
    for (const [,, v] of innerLoop.encloses) {
      if (curve.passesThrough(v.point)) {
        crossings.push({
          point: v.point,
          curveParam: curve.param(v.point),
          edgeParam: null,
          halfEdge: null,
          vertex: v
        });
      }
    }
  }

  // Sort by curve parameter
  crossings.sort((a, b) => a.curveParam - b.curveParam);

  // Deduplicate crossings at the same point
  const deduped = [];
  for (const c of crossings) {
    if (deduped.length === 0 || !veq(c.point, deduped[deduped.length - 1].point)) {
      deduped.push(c);
    }
  }

  // Pair up crossings: test midpoint of each segment to see if it's inside the face
  const segments = [];
  for (let i = 0; i < deduped.length - 1; i++) {
    const c1 = deduped[i];
    const c2 = deduped[i + 1];
    const midParam = (c1.curveParam + c2.curveParam) / 2;
    const midPoint = curve.point(midParam);

    if (face.rayCast(midPoint).inside) {
      // This segment is inside the face — create a trimmed curve
      let segCurve = curve;
      const splits = segCurve.splitByParam(c2.curveParam);
      if (splits) {
        segCurve = splits[0];
      }
      const splits2 = segCurve.splitByParam(c1.curveParam);
      if (splits2) {
        segCurve = splits2[1];
      }

      const startVertex = c1.vertex || vFactory.create(c1.point);
      const endVertex = c2.vertex || vFactory.create(c2.point);

      segments.push({
        curve: segCurve,
        startVertex,
        endVertex,
        startCrossing: c1,
        endCrossing: c2
      });
    }
  }

  // Also check if the entire curve is inside the face (no crossings at all)
  if (deduped.length === 0) {
    const midPoint = curve.middlePoint();
    if (face.rayCast(midPoint).inside) {
      const startVertex = vFactory.create(curve.startPoint());
      const endVertex = vFactory.create(curve.endPoint());
      segments.push({
        curve,
        startVertex,
        endVertex,
        startCrossing: null,
        endCrossing: null
      });
    }
  }

  return segments;
}

function splitBoundaryAtVertex(face, vertex, vFactory) {
  // Find if this vertex lies on a boundary edge of the face and split it
  for (const loop of face.loops) {
    for (const he of loop.halfEdges) {
      if (he.vertexA === vertex || he.vertexB === vertex) {
        continue; // Already at an endpoint
      }
      if (he.edge.curve.passesThrough(vertex.point)) {
        splitEdgeByVertex(he.edge, vertex);
        return;
      }
    }
  }
}

function detectFaceLoops(face, newEdges) {
  // Build a graph of all half-edges (boundary + new intersection edges)
  const graph = new EdgeGraph();

  for (const he of face.edges) {
    graph.add(he);
  }
  for (const edge of newEdges) {
    graph.add(edge.halfEdge1);
    graph.add(edge.halfEdge2);
  }

  // Detect loops using left-turn walk
  graph.graphEdges.sort((e1, e2) => {
    // Prioritize new intersection edges (they have no loop assigned yet)
    const p1 = e1.loop ? 0 : 1;
    const p2 = e2.loop ? 0 : 1;
    return p1 - p2;
  });

  const loops = [];
  const seen = new Set();

  for (;;) {
    let edge = graph.graphEdges.pop();
    if (!edge) break;
    if (seen.has(edge)) continue;

    const loop = new Loop(null);
    while (edge) {
      seen.add(edge);
      loop.halfEdges.push(edge);

      if (loop.halfEdges.length > 1 && loop.halfEdges[0].vertexA === edge.vertexB) {
        // Loop closed
        loops.push(loop);
        break;
      }

      let candidates = graph.vertexToEdge.get(edge.vertexB);
      if (!candidates) break;
      candidates = candidates.filter(c => !seen.has(c));
      if (candidates.length === 0) break;

      edge = findMaxTurningLeft(edge, candidates, face.surface);
      if (seen.has(edge)) break;
    }
  }

  return loops;
}

// ============================================================================
// Phase 4: Fragment Classification
// ============================================================================

function classifyFragments(fragments, otherShell) {
  for (const frag of fragments) {
    const interiorPoint = pickInteriorPoint(frag.face);
    if (interiorPoint === null) {
      frag.classification = 'OUT'; // Fallback
      continue;
    }
    frag.classification = classifyPointAgainstShell(interiorPoint, otherShell);
  }
}

function pickInteriorPoint(face) {
  // Strategy 1: Centroid of outer loop tessellation
  const tess = face.outerLoop.tess();
  if (tess.length < 3) return null;

  // Compute centroid
  let cx = 0, cy = 0, cz = 0;
  for (const p of tess) {
    cx += p.x; cy += p.y; cz += p.z;
  }
  cx /= tess.length; cy /= tess.length; cz /= tess.length;

  // Project centroid onto the surface
  const centroid = new (tess[0].constructor)(cx, cy, cz);
  const uv = face.surface.param(centroid);
  const projected = face.surface.point(uv[0], uv[1]);

  const rc = face.rayCast(projected);
  if (rc.strictInside) {
    return projected;
  }

  // Strategy 2: Push edge midpoint inward
  const he = face.outerLoop.halfEdges[0];
  if (!he) return null;
  const edgeMid = he.edge.curve.middlePoint();
  const edgeTangent = he.tangent(edgeMid);
  const normal = face.surface.normal(edgeMid);
  const inward = normal.cross(edgeTangent);

  // If the half-edge direction is such that inward points outside, flip
  const testPoint = edgeMid.plus(inward.multiply(TOLERANCE * 100));
  const rc2 = face.rayCast(testPoint);
  if (rc2.strictInside) return testPoint;

  const testPoint2 = edgeMid.minus(inward.multiply(TOLERANCE * 100));
  const rc3 = face.rayCast(testPoint2);
  if (rc3.strictInside) return testPoint2;

  // Strategy 3: Try each tessellation point
  for (const p of tess) {
    const rc4 = face.rayCast(p);
    if (rc4.strictInside) return p;
  }

  return null;
}

function classifyPointAgainstShell(point, shell) {
  // Find the closest face in the shell to the test point
  let bestDist = Infinity;
  let bestFace = null;
  let bestSurfacePoint = null;

  for (const face of shell.faces) {
    const uv = face.surface.param(point);
    const surfPt = face.surface.point(uv[0], uv[1]);
    const dist = point.distanceToSquared(surfPt);

    if (dist < bestDist) {
      bestDist = dist;
      bestFace = face;
      bestSurfacePoint = surfPt;
    }
  }

  if (!bestFace) return 'OUT';

  const normal = bestFace.surface.normal(bestSurfacePoint);
  const toPoint = point.minus(bestSurfacePoint);
  const dotProduct = toPoint.dot(normal);

  // Clear-cut cases: point is clearly on one side of the closest face
  if (dotProduct > TOLERANCE) return 'OUT';
  if (dotProduct < -TOLERANCE) return 'IN';

  // Point is ON the surface (within tolerance).
  // This is the common case for overlapping/touching faces.

  // First check: is the point actually inside the closest face's boundary?
  const rc = bestFace.rayCast(point);
  if (!rc.inside) {
    // Point is near a face surface but outside its boundary.
    // Look at the next-closest non-coplanar face for a better answer.
    return classifyBySecondClosestFace(point, shell, bestFace);
  }

  // Point IS on a face of the other solid (coplanar overlap).
  // This face is redundant — the corresponding face from the other shell has
  // already been split to account for this overlap. Keeping both would produce
  // duplicate/overlapping faces. Mark as 'ON' so the selection phase excludes it.
  return 'ON';
}

function classifyBySecondClosestFace(point, shell, excludeFace) {
  let bestDist = Infinity;
  let bestFace = null;
  let bestSurfPt = null;

  for (const face of shell.faces) {
    if (face === excludeFace) continue;
    const uv = face.surface.param(point);
    const surfPt = face.surface.point(uv[0], uv[1]);
    const dist = point.distanceToSquared(surfPt);

    if (dist < bestDist) {
      bestDist = dist;
      bestFace = face;
      bestSurfPt = surfPt;
    }
  }

  if (!bestFace) return 'IN'; // Single face solid, we're on it → inside

  const normal = bestFace.surface.normal(bestSurfPt);
  const toPoint = point.minus(bestSurfPt);
  const dot = toPoint.dot(normal);

  return dot > 0 ? 'OUT' : 'IN';
}

// ============================================================================
// Phase 5: Fragment Selection
// ============================================================================

function selectFragments(fragments, operationType) {
  const selected = [];
  for (const frag of fragments) {
    if (operationType === TYPE.INTERSECT && frag.classification === 'IN') {
      selected.push(frag.face);
    } else if (operationType === TYPE.UNION && frag.classification === 'OUT') {
      selected.push(frag.face);
    }
  }
  return selected;
}

// ============================================================================
// Phase 6: Assembly
// ============================================================================

function assembleResult(faces) {
  const result = new Shell();
  for (const face of faces) {
    face.shell = result;
    result.faces.push(face);
  }
  return result;
}


// ============================================================================
// Edge Splitting
// ============================================================================

function splitEdgeByVertex(edge, vertex) {
  if (edge.halfEdge1.vertexA === vertex || edge.halfEdge1.vertexB === vertex) {
    return null;
  }

  const curves = edge.curve.split(vertex.point);
  if (!curves) return null;

  const edge1 = new Edge(curves[0], edge.halfEdge1.vertexA, vertex);
  const edge2 = new Edge(curves[1], vertex, edge.halfEdge1.vertexB);

  function updateInLoop(halfEdge, h1, h2) {
    if (!halfEdge.loop) return;
    const halfEdges = halfEdge.loop.halfEdges;
    const idx = halfEdges.indexOf(halfEdge);
    if (idx === -1) return;
    halfEdges.splice(idx, 1, h1, h2);
    h1.loop = halfEdge.loop;
    h2.loop = halfEdge.loop;

    h1.prev = halfEdge.prev;
    if (h1.prev) h1.prev.next = h1;

    h1.next = h2;
    h2.prev = h1;

    h2.next = halfEdge.next;
    if (h2.next) h2.next.prev = h2;
  }

  updateInLoop(edge.halfEdge1, edge1.halfEdge1, edge2.halfEdge1);
  updateInLoop(edge.halfEdge2, edge2.halfEdge2, edge1.halfEdge2);

  return [edge1, edge2];
}

// ============================================================================
// Loop Detection Helpers
// ============================================================================

function findMaxTurningLeft(pivotEdge, edges, surface) {
  edges = edges.slice();
  function edgeVector(edge) {
    return edge.tangent(edge.vertexA.point);
  }
  const pivot = pivotEdge.tangent(pivotEdge.vertexB.point).negate();
  const normal = surface.normal(pivotEdge.vertexB.point);
  edges.sort((e1, e2) => {
    return leftTurningMeasure(pivot, edgeVector(e1), normal)
         - leftTurningMeasure(pivot, edgeVector(e2), normal);
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
  return measure;
}

// ============================================================================
// Data Structures
// ============================================================================

class FaceFragment {
  constructor(face, originFace, sourceShell) {
    this.face = face;
    this.originFace = originFace;
    this.sourceShell = sourceShell;
    this.classification = null; // 'IN' or 'OUT'
    this.hasNewEdges = false;
  }
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

// ============================================================================
// Preserved Exports (used by face.ts, exposure.js, etc.)
// ============================================================================

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

export function loopsToFaces(originFace, loops, out) {
  const newFaces = evolveFace(originFace, loops);
  for (const newFace of newFaces) {
    out.push(newFace);
  }
}

export function isOnPositiveHalfPlaneFromVec(vec, testee, normal) {
  return vec.cross(testee).dot(normal) > 0;
}

export function isInsideEnclose(normal, testee, inVec, outVec, strict) {
  if (strict && veq(outVec, testee)) {
    throw new CadError({
      relatedTopoObjects: [testee]
    });
  }

  const pivot = inVec.negate();
  if (strict && veq(pivot, testee)) {
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
  const normal = edge.loop.face.surface.normal(point);
  const edgeTangent = edge.tangent(point);
  const curveTangent = curve.tangentAtPoint(point);

  return isOnPositiveHalfPlaneFromVec(edgeTangent, curveTangent, normal);
}

export function chooseValidEdge(edge, face, operationType) {
  return canEdgeBeTransferred(edge, face, operationType) ? edge : edge.twin();
}

function canEdgeBeTransferred(edge, face, operationType) {
  const testPoint = edge.edge.curve.middlePoint();
  const edgeTangent = edge.tangent(testPoint);
  const edgeFaceNormal = edge.loop.face.surface.normal(testPoint);
  const edgeFaceDir = edgeFaceNormal.cross(edgeTangent);
  const faceNormal = face.surface.normal(testPoint);
  const outsideMeasure = edgeFaceDir.dot(faceNormal);

  if (eqTol(outsideMeasure, 0)) {
    return undefined;
  }

  const outside = outsideMeasure > 0;
  return (operationType === TYPE.INTERSECT) !== outside;
}

// ============================================================================
// Utility Functions
// ============================================================================

function curveAndEdgeCoincident(curve, edge) {
  const tess = edge.tessellate();
  for (let i = tess.length - 1; i >= 0; i--) {
    const pt1 = tess[i];
    const pt2 = curve.point(curve.param(pt1));
    if (!veq(pt1, pt2)) {
      return false;
    }
  }
  return true;
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
      arr.splice(i, 1);
    }
  }
}
