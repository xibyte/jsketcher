import {Shell} from './topo/shell'
import {Vertex} from './topo/vertex'
import {Loop} from './topo/loop'
import {Face} from './topo/face'
import {HalfEdge, Edge} from './topo/edge'
import {Line} from './geom/impl/line'
import {ApproxCurve, ApproxSurface} from './geom/impl/approx'
import {NurbsSurface, NurbsCurve} from './geom/impl/nurbs'
import {Plane} from './geom/impl/plane'
import {Point} from './geom/point'
import {BasisForPlane, Matrix3} from '../math/l3space'
import {CompositeCurve} from './geom/curve'
import * as cad_utils from '../3d/cad-utils'
import * as math from '../math/math'
import verb from 'verb-nurbs'
import {StitchedCurve, StitchedSurface, EDGE_AUX} from './stitching'
import {initTiles, refine} from './nurbs-tiling'
import mergeNullFace from './null-face-merge'
import {invert} from './operations/boolean'
import {rotateArr} from '../utils/utils'

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
    basePath.add(Line.fromSegment(basePoints[i], basePoints[j]), basePoints[i], null);
    lidPath.add(Line.fromSegment(lidPoints[i], lidPoints[j]), lidPoints[i], null);
  }
  return enclose(basePath, lidPath, baseSurface, lidSurface, () => {});
}

export function enclose(basePath, lidPath, baseSurface, lidSurface) {

  if (basePath.points.length != lidPath.points.length) {
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
  return assemble(walls, baseSurface, lidSurface)
}

function assemble(walls, baseSurface, lidSurface) {
  const baseLoop = new Loop();
  const lidLoop = new Loop();
  const shell = new Shell();

  for (let wall of walls) {

    function addHalfEdges(loop, edges) {
      for (let i = edges.length - 1; i >= 0; i--) {
        let he = edges[i];
        he.edge = new Edge(Line.fromSegment(he.vertexA.point, he.vertexB.point))
        const twin = new HalfEdge().setAB(he.vertexB, he.vertexA);
        twin.loop = loop;
        loop.halfEdges.push(twin);
        he.edge.link(twin, he);
      }
    }
    addHalfEdges(baseLoop, wall.bottomEdges);
    addHalfEdges(lidLoop, wall.topEdges);

    for (let wallFace of wall.faces) {
      shell.faces.push(wallFace);
    }
  }

  lidLoop.halfEdges.reverse();
  rotateArr(lidLoop.halfEdges, 1); // keep old order for the unit tests
  linkSegments(baseLoop.halfEdges);
  linkSegments(lidLoop.halfEdges);

  connectWalls(walls);

  const baseFace = createFace(baseSurface, baseLoop);
  const lidFace = createFace(lidSurface, lidLoop);

  shell.faces.push(baseFace, lidFace);
  shell.faces.forEach(f => f.shell = shell);
  return shell;
}

function vertIsoCurve(nurbs, param, useU) {
  const domU = nurbs.domainU();
  const data = verb.eval.Make.surfaceIsocurve(nurbs._data, param, useU);
  return new verb.geom.NurbsCurve(data);
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

function createPlaneFace(loop) {
  const normal = cad_utils.normalOfCCWSeq(loop.halfEdges.map(e => e.vertexA.point));
  const plane = createPlaneForLoop(normal, loop);
  const face = new Face(plane);
  face.outerLoop = loop;
  loop.face = face;
  return face;
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
  return o1.constructor.name == className && o2.constructor.name == className;
}

class Wall {

  constructor(faces, bottomEdges, rightEdges, topEdges, leftEdges, surface) {
    this.faces = faces;
    this.bottomEdges = bottomEdges;
    this.rightEdges = rightEdges;
    this.topEdges = topEdges;
    this.leftEdges = leftEdges;
    this.surface = surface;
  }
}

export function createWall(curve1, curve2, vertexNB, vertexCB, vertexCL, vertexNL) {
  if (bothClassOf(curve1, curve2, 'Line')) {
    const loop = new Loop();
    loop.halfEdges.push(
      HalfEdge.create(vertexNB, vertexCB, loop, new Edge(curve1)),
      HalfEdge.create(vertexCB, vertexCL, loop),
      HalfEdge.create(vertexCL, vertexNL, loop, new Edge(curve2)),
      HalfEdge.create(vertexNL,  vertexNB, loop));

    linkSegments(loop.halfEdges);

    return new Wall([createPlaneFace(loop)], [loop.halfEdges[0]], [loop.halfEdges[1]], [loop.halfEdges[2]], [loop.halfEdges[3]] );
  } else if (bothClassOf(curve1, curve2, 'NurbsCurve')) {
    const nurbs = verb.geom.NurbsSurface.byLoftingCurves([curve1.verb.reverse(), curve2.verb.reverse()], 1);
    return wallFromNUBRS(nurbs, true, vertexNB, vertexCB, vertexCL, vertexNL);
  } else {
    throw 'unsupported';
  }
}

function swapUV(surface) {
  throw 'not implemented';
  const data = surface._data;
  verb_eval_Modify.knotsReverse()
  return new verb.geom.NurbsCurve(new verb.core.NurbsSurfaceData(data.degreeV, data.degreeU, surface.knotsV, surface.knotsU));
}

export function wallFromNUBRS(surface, vFlat, vertexNB, vertexCB, vertexCL, vertexNL) {

  const outerEdges = {
    bottom : [],
    right : [],
    top : [],
    left : []
  };
  const stitched = new StitchedSurface();
  stitched.origin = surface;

  const opts = {};
  if (vFlat) {
    opts.maxVSplits = 1;
  }

  const tiles = initTiles(surface, opts);
  refine(tiles, {vMax: vFlat ? 0 : undefined});
  function vertex(uv) {
    if (!uv._vertex) {
      uv._vertex = new Vertex(new Point().set3(surface.point(uv.u, uv.v)));
    }
    return uv._vertex;
  }

  var nVs = tiles.length - 1;
  var nUs = tiles[0].length - 1;

  tiles[0][0].edges[0].a._vertex = vertexNB;
  tiles[0][nUs].edges[0].b._vertex = vertexCB;
  tiles[nVs][nUs].edges[1].b._vertex = vertexCL;
  tiles[nVs][0].edges[2].b._vertex = vertexNL;

  for (let row of tiles) {
    for (let tile of row) {
      tile.leafs(tileLeaf => {
        const loop = new Loop();
        const vertexNormals = new Map();
        for (let e of tileLeaf.edges) {
          e.leafs(edgeLeaf => {
            if (!edgeLeaf._halfEdge) {
              const a = vertex(e.a);
              const b = vertex(e.b);
              edgeLeaf._halfEdge = new HalfEdge().setAB(a, b);
              if (edgeLeaf.outer) {
                outerEdges[edgeLeaf.outer].push(edgeLeaf._halfEdge);
              } else {
                edgeLeaf.twin._halfEdge = new HalfEdge().setAB(b, a);
                const edge = new Edge(Line.fromSegment(a.point, b.point));
                edge.link(edgeLeaf._halfEdge, edgeLeaf.twin._halfEdge);
                edge.data[EDGE_AUX] = stitched;
              }
              vertexNormals.set(a, e.a.normal());
              vertexNormals.set(b, e.b.normal());
            }
            edgeLeaf._halfEdge.loop = loop;
            loop.halfEdges.push(edgeLeaf._halfEdge);
          });
        }
        linkSegments(loop.halfEdges);
        const face = createPlaneFace(loop);
        face.data.VERTEX_NORMALS = vertexNormals;
        stitched.addFace(face);
      });
    }
  }

  return new Wall(stitched.faces, outerEdges.bottom, outerEdges.right, outerEdges.top, outerEdges.left, surface);
}
