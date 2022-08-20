import {Shell} from '../topo/shell';
import {Face} from '../topo/face';
import {Edge} from '../topo/edge';
import BrepCurve from 'geom/curves/brepCurve';
import {Plane} from 'geom/impl/plane';
import * as cad_utils from '../../../web/app/cad/cad-utils';
import {createBoundingSurface} from '../brep-builder';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {BrepSurface} from 'geom/surfaces/brepSurface';
import {Matrix3x4} from 'math/matrix';
import {BasisForPlane} from "math/basis";
import {isCCW as isCCWtest} from "geom/euclidean";

function isCCW(points, normal) {
  const tr2d = new Matrix3x4().setBasis(BasisForPlane(normal)).invert();
  const points2d = points.map(p => tr2d.apply(p));
  return isCCWtest(points2d);
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
    const j = (i + 1) % basePoints.length;
    basePath.push(BrepCurve.createLinearCurve(basePoints[i], basePoints[j]));
    lidPath.push(BrepCurve.createLinearCurve(lidPoints[i], lidPoints[j]));
  }
  return enclose(basePath, lidPath, baseSurface, lidSurface);
}

export function enclose(basePath, lidPath, basePlane, lidPlane) {

  if (basePath.length !== lidPath.length) {
    throw 'illegal arguments';
  }

  if (basePath.length === 1) {
    basePath = basePath[0].splitByParam(basePath[0].uMid);
    lidPath = lidPath[0].splitByParam(lidPath[0].uMid);
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

  for (const w of walls) {
    const wallEdge = Edge.fromCurve(w.isoCurveAlignV(0));
    wallEdges.push(wallEdge);
  }

  for (let i = 0; i < wallEdges.length; ++i) {
    const j = (i + 1) % wallEdges.length;
    const curr = wallEdges[i];
    const next = wallEdges[j];
    const wall = walls[i];

    const baseEdge = new Edge(wall.isoCurveAlignU(1), curr.halfEdge1.vertexB, next.halfEdge1.vertexB);
    const lidEdge = new Edge(wall.isoCurveAlignU(0), curr.halfEdge1.vertexA, next.halfEdge1.vertexA);

    baseEdges.push(baseEdge);
    lidEdges.push(lidEdge);

    const wallFace = new Face(wall);
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

  base.surface = createBoundingSurface(base.outerLoop.tess(), basePlane);
  lid.surface = createBoundingSurface(lid.outerLoop.tess(), lidPlane);

  shell.faces.push(base, lid);
  shell.faces.forEach(f => f.shell = shell);
  return shell;
}

function bothClassOf(o1, o2, className) {
  return o1.constructor.name === className && o2.constructor.name === className;
}

export function createWall(curve1, curve2) {
  return new BrepSurface(NurbsSurface.loft(curve2, curve1, 1));
}


