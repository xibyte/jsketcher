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
  return enclose(basePath, lidPath, baseSurface, lidSurface, () => {});
}

export function enclose(basePath, lidPath, basePlane, lidPlane) {

  if (basePath.points.length !== lidPath.points.length) {
    throw 'illegal arguments';
  }

  const walls = [];

  const baseVertices = basePath.points.map(p => new Vertex(p));
  const lidVertices = lidPath.points.map(p => new Vertex(p));

  const n = basePath.points.length;
  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    const wall = createWall(basePath.curves[i], lidPath.curves[i], baseVertices[j], baseVertices[i], lidVertices[i], lidVertices[j]);
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

    let baseEdge = new Edge(wall.isoCurveAlignU(0), curr.halfEdge1.vertexA, next.halfEdge1.vertexA);
    let lidEdge = new Edge(wall.isoCurveAlignU(1), curr.halfEdge1.vertexB, next.halfEdge1.vertexB);

    baseEdges.push(baseEdge);
    lidEdges.push(lidEdge);

    let wallFace = new Face(wall);
    wallFace.outerLoop.halfEdges.push(baseEdge.halfEdge2, curr.halfEdge1, lidEdge.halfEdge1, next.halfEdge2);
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

function assembleRevolved(walls, baseSurface, lidSurface) {
  const baseLoop = new Loop();
  const lidLoop = new Loop();
  const shell = new Shell();

  // walls.reverse();
  iterateSegments(walls, (wall, next) => {

    const nullFace = new Face();
    nullFace.outerLoop = new Loop();
    function addEdge(he) {
      he.edge = new Edge(Line.fromSegment(he.vertexA.point, he.vertexB.point))
      const twin = new HalfEdge().setAB(he.vertexB, he.vertexA);
      twin.loop = nullFace.outerLoop;
      nullFace.outerLoop.halfEdges.push(twin);
      he.edge.link(twin, he);
    }

    for (let he of wall.topEdges) {
      addEdge(he);
//      __DEBUG__.AddHalfEdge(he);
    }

    for (let i = next.bottomEdges.length - 1; i >= 0; i--) {
      let he = next.bottomEdges[i];
      addEdge(he);
//      __DEBUG__.AddHalfEdge(he, 0xffffff);
    }


    linkSegments(nullFace.outerLoop.halfEdges);
    nullFace.data.NULL_FACE = {
      curve: vertIsoCurve(wall.surface, 1, true),
      start: wall.topEdges[0].twin()
    };
//    __DEBUG__.AddPoint.apply(null, nullFace.data.NULL_FACE.curve.point(0.0))
//    __DEBUG__.AddPoint.apply(null, nullFace.data.NULL_FACE.curve.point(0.1))
//    __DEBUG__.AddPoint.apply(null, nullFace.data.NULL_FACE.curve.point(0.2))
//    __DEBUG__.AddPoint.apply(null, nullFace.data.NULL_FACE.curve.point(0.3))
//    __DEBUG__.AddPoint.apply(null, nullFace.data.NULL_FACE.curve.point(0.4))
//    __DEBUG__.AddPoint.apply(null, nullFace.data.NULL_FACE.curve.point(0.5))
    mergeNullFace(nullFace.data.NULL_FACE);
  });


  for (let wall of walls) {

    function addHalfEdges(loop, edges) {
//      for (let i = edges.length - 1; i >= 0; i--) {
//        let he = edges[i];
      for (let he of edges) {
        he.edge = new Edge(Line.fromSegment(he.vertexA.point, he.vertexB.point))
        const twin = new HalfEdge().setAB(he.vertexB, he.vertexA);
        __DEBUG__.AddHalfEdge(twin)
        twin.loop = loop;
        loop.halfEdges.push(twin);
        he.edge.link(twin, he);
      }
    }
    addHalfEdges(baseLoop, wall.leftEdges);
    addHalfEdges(lidLoop, wall.rightEdges);

    for (let wallFace of wall.faces) {
      shell.faces.push(wallFace);
    }
  }
  
  // walls.reverse();

  lidLoop.halfEdges.reverse();
  linkSegments(baseLoop.halfEdges);
  linkSegments(lidLoop.halfEdges);

  const baseFace = createFace(baseSurface, baseLoop);
  const lidFace = createFace(lidSurface, lidLoop);

  shell.faces.push(baseFace, lidFace);
  shell.faces.forEach(f => f.shell = shell);
  return shell;
}

function connectWalls(walls) {

  iterateSegments(walls, (a, b) => {

    function connect(halfEdgeA, halfEdgeB) {
      const curve = Line.fromSegment(halfEdgeA.vertexA.point, halfEdgeA.vertexB.point);
      new Edge(curve).link(halfEdgeA, halfEdgeB);
    }

    let aEdges = a.leftEdges;
    let bEdges = b.rightEdges;

    if (aEdges.length == 1 && bEdges.length == 1) {
      connect(aEdges[0], bEdges[0])
    } else {
      throw "unsupported: use 'null-face' like it's done for the revolve and then merge it";
    }
  });
}

export function revolveToWallNurbs(basePath, surface, p0, v, angle) {
  const nurbses = [];
  const n = basePath.points.length;
  for (let i = 0; i < n; i++) {
    const curve = basePath.groups[i].toNurbs(surface);
    const nurbs = new verb.geom.RevolvedSurface(curve.verb, p0.data(), v.data(), -angle);
    nurbses.push(nurbs);
  }
  return nurbses;
}

function swap(obj, prop1, prop2) {
  const tmp = obj[prop1];
  obj[prop1] = obj[prop2];
  obj[prop2] = tmp;
}

export function revolve(basePath, baseSurface, p0, v, angle) {

  angle = -angle;

  const baseLoop = new Loop();

  const shell = new Shell();
  const walls = [];

  const n = basePath.points.length;

  const baseVertices = [];
  const lidVertices = [];

  const nurbses = revolveToWallNurbs(basePath, baseSurface, p0, v, -angle);

  for (let nurbs of nurbses) {
    const domU = nurbs.domainU();
    const domV = nurbs.domainV();
    // profile of revolving becomes V direction
    baseVertices.push(new Vertex(new Point().set3(nurbs.point(domU.min, domV.min))));
    lidVertices.push(new Vertex(new Point().set3(nurbs.point(domU.max, domV.min))));
  }

  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    const nurbs = nurbses[i];
    const wall = wallFromNUBRS(nurbs, false, baseVertices[i], lidVertices[i], lidVertices[j], baseVertices[j]);
    walls.push(wall);
  }

  const normal = cad_utils.normalOfCCWSeq([lidVertices[2].point, lidVertices[1].point, lidVertices[0].point]);
  const w = lidVertices[0].point.dot(normal);
  const planeLid = new Plane(normal, w);

  let revolved = assembleRevolved(walls, baseSurface, planeLid);
  if (angle < 0) {
    invert(revolved);
  }
  return revolved;
}

function createTwin(halfEdge) {
  const twin = new HalfEdge();
  twin.vertexA = halfEdge.vertexB;
  twin.vertexB = halfEdge.vertexA;
  twin.edge = halfEdge.edge;
  if (halfEdge.edge.halfEdge1 == halfEdge) {
    halfEdge.edge.halfEdge2 = twin;
  }  else {
    halfEdge.edge.halfEdge1 = twin;
  }
  return twin;
}

function createFace(surface, loop) {
  const face = new Face(surface);
  face.outerLoop = loop;
  loop.face = face;
  return face;
}


function createPlaneForLoop(normal, loop) {
  const w = loop.halfEdges[0].vertexA.point.dot(normal);
  const plane = new Plane(normal, w);
  return plane;
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
    polygon[1].data(), polygon[0].data()), polygon[2].minus(polygon[1]).data()));

  return nurbs;
}


export function linkHalfEdges(edge, halfEdge1, halfEdge2) {
  halfEdge1.edge = edge;
  halfEdge2.edge = edge;
  edge.halfEdge1 = halfEdge1;
  edge.halfEdge2 = halfEdge2;
}

export function createHalfEdge(loop, vertexA, vertexB) {
  const halfEdge = new HalfEdge();
  halfEdge.loop = loop;
  halfEdge.vertexA = vertexA;
  halfEdge.vertexB = vertexB;
  loop.halfEdges.push(halfEdge);
  return halfEdge;
}

export function linkSegments(halfEdges) {
  iterateSegments(halfEdges, (prev, next) => {
    prev.next = next;
    next.prev = prev;
  });
}

export function point(x, y, z) {
  return new Point(x, y, z);
}

export function iterateSegments(items, callback) {
  let length = items.length;
  for (let i = 0; i < length; i++) {
    let j = (i + 1) % length;
    callback(items[i], items[j], i, j);
  }
}

export function invertLoop(loop) {
  for (let halfEdge of loop.halfEdges) {
    const t = halfEdge.vertexA;
    halfEdge.vertexA = halfEdge.vertexB;
    halfEdge.vertexB = t;
  }
  loop.halfEdges.reverse();
  linkSegments(loop.halfEdges);
}

export function createPlaneLoop(vertices, curves) {

  const loop = new Loop();

  iterateSegments(vertices, (a, b, i) => {
    const halfEdge = createHalfEdge(loop, a, b);
    halfEdge.edge = new Edge(curves[i] ? curves[i] : Line.fromSegment(a.point, b.point));
    return halfEdge;
  });

  linkSegments(loop.halfEdges);
  return loop;
}

function bothClassOf(o1, o2, className) {
  return o1.constructor.name === className && o2.constructor.name === className;
}

export function createWall(curve1, curve2) {
  if (bothClassOf(curve1, curve2, 'Line')) {
    throw 'unsupported'
  } else if (bothClassOf(curve1, curve2, 'NurbsCurve')) {
    return new NurbsSurface(verb.geom.NurbsSurface.byLoftingCurves([curve1.verb, curve2.verb], 1));
  } else {
    throw 'unsupported';
  }
}


