import {Shell} from './topo/shell'
import {Vertex} from './topo/vertex'
import {Loop} from './topo/loop'
import {Face} from './topo/face'
import {HalfEdge, Edge} from './topo/edge'
import {Line} from './geom/impl/line'
import {NurbsSurface} from './geom/impl/nurbs'
import BrepCurve from './geom/curves/brepCurve';
import {Plane} from './geom/impl/plane'
import {Point} from './geom/point'
import {BasisForPlane, Matrix3} from '../math/l3space'
import * as cad_utils from '../cad/cad-utils'
import * as math from '../math/math'
import mergeNullFace from './null-face-merge'
import {invert} from './operations/boolean'
import {createBoundingNurbs} from './brep-builder'

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
  const normal = cad_utils.normalOfCCWSeq(basePoints);
  const baseSurface = new Plane(normal, normal.dot(basePoints[0]));
  const extrudeVector = baseSurface.normal.multiply( - height);
  const lidSurface = baseSurface.translate(extrudeVector).invert();
  const lidPoints = basePoints.map(p => p.plus(extrudeVector));
  const basePath = [];
  const lidPath = [];

  for (let i = 0; i < basePoints.length; i++) {
    let j = (i + 1) % basePoints.length;
    basePath.push(BrepCurve.createLinearNurbs(basePoints[i], basePoints[j]));
    lidPath.push(BrepCurve.createLinearNurbs(lidPoints[i], lidPoints[j]));
  }
  return enclose(basePath, lidPath, baseSurface, lidSurface);
}

export function enclose(basePath, lidPath, basePlane, lidPlane) {

  if (basePath.length !== lidPath.length) {
    throw 'illegal arguments';
  }

  if (basePath.length === 1) {
    basePath = basePath[0].splitByParam(0.5);
    lidPath = lidPath[0].splitByParam(0.5);
  }

  const walls = [];

  const n = basePath.length;
  for (let i = 0; i < n; i++) {
    const wall = createWall(basePath[i], lidPath[i]);
    walls.push(wall);
  }
  return assemble(walls, basePlane, lidPlane)
}

function assemble(walls, basePlane, lidPlane) {

  const shell = new Shell();

  const wallEdges = [];
  const baseEdges = [];
  const lidEdges = [];

  for (let w of walls) {
    let wallEdge = Edge.fromCurve(w.isoCurveAlignV(0));
    wallEdges.push(wallEdge);
  }

  for (let i = 0; i < wallEdges.length; ++i) {
    let j = (i + 1) % wallEdges.length;
    let curr = wallEdges[i];
    let next = wallEdges[j];
    let wall = walls[i];

    let baseEdge = new Edge(wall.isoCurveAlignU(1), curr.halfEdge1.vertexB, next.halfEdge1.vertexB);
    let lidEdge = new Edge(wall.isoCurveAlignU(0), curr.halfEdge1.vertexA, next.halfEdge1.vertexA);

    baseEdges.push(baseEdge);
    lidEdges.push(lidEdge);

    let wallFace = new Face(wall);
    wallFace.outerLoop.halfEdges.push(baseEdge.halfEdge2, curr.halfEdge2, lidEdge.halfEdge1, next.halfEdge1);
    wallFace.outerLoop.link();
    shell.faces.push(wallFace);
  }
  const base = new Face();
  const lid = new Face();

  lidEdges.reverse();

  baseEdges.forEach(e => base.outerLoop.halfEdges.push(e.halfEdge1));
  lidEdges.forEach(e => lid.outerLoop.halfEdges.push(e.halfEdge2));

  base.outerLoop.link();
  lid.outerLoop.link();

  base.surface = createBoundingNurbs(base.outerLoop.tess(), basePlane);
  lid.surface = createBoundingNurbs(lid.outerLoop.tess(), lidPlane);

  shell.faces.push(base, lid);
  shell.faces.forEach(f => f.shell = shell);
  return shell;
}

function bothClassOf(o1, o2, className) {
  return o1.constructor.name === className && o2.constructor.name === className;
}

export function createWall(curve1, curve2) {
  return NurbsSurface.loft(curve2, curve1, 1);
}


