import * as vec from 'math/vec';
import {iteratePath} from '../cad-utils';
import NurbsCurve from 'geom/curves/nurbsCurve';
import {veqXYZ} from 'geom/tolerance';
import curveTess, {curveTessParams} from 'geom/impl/curve/curve-tess';
import {distanceAB} from "math/distance";
import {areEqual, TOLERANCE} from "math/equality";
import {circleFromPoints, radiusOfCurvature} from "geom/euclidean";

export function getSketchBoundaries(sceneFace) {
  const boundary = {lines: [], arcs: [], circles: [], nurbses: []};
  let w2sTr = sceneFace.worldToSketchTransformation;
  let _w2sTrArr = null;
  let w2sTrArr = () => _w2sTrArr || (_w2sTrArr = w2sTr.toArray()); 
  if (!sceneFace.brepFace) {
    return boundary;
  }
  for (let he of sceneFace.brepFace.edges) {
    const edge = sceneFace.shell.brepRegistry.get(he.edge);
    if (!edge) {
      continue;
    }
    const id = edge.id;
    const curve = he.edge.curve.impl;
    if (curve.constructor.name === 'NurbsCurve' && curve.degree() !== 1) {
      let curve2d = curve.transform(w2sTrArr());
      let arcRadius = findArcRadius(curve2d);
      if (arcRadius !== null){
        let [from, to] = curve2d.domain();
        let [A, DA, DDA] = curve2d.eval(from, 2);
        let [B, DB] = curve2d.eval(to, 1);

        let mA = vec.normalize(DA);
        let mmA = vec.normalize(DDA);

        let orient = mA[0] * mmA[1] - mA[1] * mmA[0];

        let k = orient < 0 ? -1 : 1;

        if (veqXYZ(A[0], A[1], 0, B[0], B[1], 0)) {
          let centripetal = perpXY(vec.mul(mA, k * arcRadius));
          let c = vec._add(centripetal, A);
          boundary.circles.push({
            id,
            c: {x: c[0], y: c[1]},
            r: arcRadius
          });
          continue;
        }

        let centripetalB = vec.normalize(DB);
        perpXY(centripetalB);

        let proj = vec.dot(mA, vec.sub(A, B));
        let u = proj / vec.dot(mA, centripetalB);

        let C = vec._add(vec._mul(centripetalB, u), B);
        boundary.arcs.push({
          id,
          a: {x: A[0], y: A[1]},
          b: {x: B[0], y: B[1]},
          c: {x: C[0], y: C[1]}
        });
      } else {
        const data = curve.transform(w2sTrArr()).serialize();
        data.id = id;
        boundary.nurbses.push(data);
      }
    } else {
      const addSegment = (id, a, b) => {
        boundary.lines.push({
          id,
          a: {x: a.x, y: a.y},
          b: {x: b.x, y: b.y}
        });
      };
      addSegment(id, w2sTr.apply(he.vertexA.point), w2sTr.apply(he.vertexB.point));
    }
  }
  return boundary;
}

function findArcRadius(curve) {
  if (curve.degree() !== 2) {
    return null;
  }
  let [uMin, uMax] = curve.domain();
  let knots = curveTessParams(curve, uMin, uMax);
  let prevRadCur = null;
  for (let knot of knots) {
    let [P, D, DD] = curve.eval(knot, 2);
    let radCur = radiusOfCurvature(D, DD);
    if (prevRadCur !== null && !areEqual(radCur, prevRadCur, 0.1)) {
      return null;
    }
    prevRadCur = radCur;
  }
  return prevRadCur;
}

function perpXY(v) {
  let [x, y] = v;

  v[0] = - y;
  v[1] =   x;
  return v;
}