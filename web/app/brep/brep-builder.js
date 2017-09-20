import {Shell} from './topo/shell'
import {Vertex} from './topo/vertex'
import {Loop} from './topo/loop'
import {Face} from './topo/face'
import {HalfEdge, Edge} from './topo/edge'
import {Line} from './geom/impl/line'
import {NurbsSurface, NurbsCurve} from './geom/impl/nurbs'
import {Plane} from './geom/impl/plane'
import {Point} from './geom/point'
import {BasisForPlane, Matrix3} from '../math/l3space'
import {CompositeCurve} from './geom/curve'
import * as cad_utils from '../3d/cad-utils'
import * as math from '../math/math'
import mergeNullFace from './null-face-merge'
import {invert} from './operations/boolean'
import BBox from "../math/bbox";

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
  const basePath = new CompositeCurve();
  const lidPath = new CompositeCurve();

  for (let i = 0; i < basePoints.length; i++) {
    let j = (i + 1) % basePoints.length;
    basePath.add(NurbsCurve.createLinearNurbs(basePoints[i], basePoints[j]), basePoints[i], null);
    lidPath.add(NurbsCurve.createLinearNurbs(lidPoints[i], lidPoints[j]), lidPoints[i], null);
  }
  return enclose(basePath, lidPath, baseSurface, lidSurface);
}

export function enclose(basePath, lidPath, basePlane, lidPlane) {

  if (basePath.points.length !== lidPath.points.length) {
    throw 'illegal arguments';
  }

  const walls = [];

  const n = basePath.points.length;
  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    const wall = createWall(basePath.curves[i], lidPath.curves[i]);
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

  base.surface = createBoundingNurbs(base.outerLoop.asPolygon(), basePlane);
  lid.surface = createBoundingNurbs(lid.outerLoop.asPolygon(), lidPlane);

  shell.faces.push(base, lid);
  shell.faces.forEach(f => f.shell = shell);
  return shell;
}

function createBoundingNurbs(points, plane) {
  if (!plane) {
    const normal = cad_utils.normalOfCCWSeq(points);
    const w = points[0].dot(normal);
    plane = new Plane(normal, w);
  }
  let to2D = plane.get2DTransformation();

  let points2d = points.map(p => to2D.apply(p));
  let bBox = new BBox();
  points2d.forEach(p => bBox.checkPoint(p));

  let to3D = plane.get3DTransformation();

  let polygon = bBox.toPolygon();
  polygon = polygon.map(p => to3D._apply(p));

  const nurbs = new NurbsSurface(new verb.geom.ExtrudedSurface(new verb.geom.Line(
    polygon[0].data(), polygon[1].data()), polygon[2].minus(polygon[1]).data()));

  return nurbs;
}

function bothClassOf(o1, o2, className) {
  return o1.constructor.name === className && o2.constructor.name === className;
}

export function createWall(curve1, curve2) {
  if (bothClassOf(curve1, curve2, 'Line')) {
    throw 'unsupported'
  } else if (bothClassOf(curve1, curve2, 'NurbsCurve')) {
    return new NurbsSurface(verb.geom.NurbsSurface.byLoftingCurves([curve2.verb, curve1.verb], 1));
  } else {
    throw 'unsupported';
  }
}


