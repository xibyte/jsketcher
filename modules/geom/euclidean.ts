import BBox from "math/bbox";

import * as vec from "math/vec";
import {newVector, perp2d, Vec3} from "math/vec";
import {TIGHT_TOLERANCE, eqTol} from "geom/tolerance";
import {distance} from "math/distance";
import {IDENTITY_BASIS3} from "math/basis";
import Vector from "math/vector";

export function circleFromPoints(p1, p2, p3) {
  const center = new Vector();
  const offset = p2.x * p2.x + p2.y * p2.y;
  const bc = (p1.x * p1.x + p1.y * p1.y - offset) / 2.0;
  const cd = (offset - p3.x * p3.x - p3.y * p3.y) / 2.0;
  const det = (p1.x - p2.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p2.y);

  if (Math.abs(det) < 1e-6) {
    return null;
  }

  const idet = 1 / det;

  center.x = (bc * (p2.y - p3.y) - cd * (p1.y - p2.y)) * idet;
  center.y = (cd * (p1.x - p2.x) - bc * (p2.x - p3.x)) * idet;
  return center;
}

export function rotate(px, py, angle) {
  return rotateInPlace(px, py, angle, new Vector());
}

export function rotateInPlace(px, py, angle, out) {
  out.x = px * Math.cos(angle) - py * Math.sin(angle);
  out.y = px * Math.sin(angle) + py * Math.cos(angle);
  return out;
}

export function polygonOffsetXY(polygon, scaleX, scaleY) {
  const origBBox = new BBox();
  const scaledBBox = new BBox();
  const result = [];
  for (const point of polygon) {
    const scaledPoint = new Vector(point.x * scaleX, point.y * scaleY);
    result.push(scaledPoint);
    origBBox.checkPoint(point);
    scaledBBox.checkPoint(scaledPoint);
  }
  const alignVector = scaledBBox.center()._minus(origBBox.center());
  for (const point of result) {
    point._minus(alignVector);
  }
  return result;
}

export function polygonOffset(polygon, scale) {
  return polygonOffsetXY(polygon, scale, scale);
}

export function polygonOffsetByDelta(polygon, delta) {
  const origBBox = new BBox();
  for (const point of polygon) {
    origBBox.checkPoint(point);
  }
  const width = origBBox.width();
  const height = origBBox.height();
  return polygonOffsetXY(polygon, (width + delta) / width, (height + delta) / height);
}

export function isPointInsidePolygon(inPt, inPolygon) {
  const EPSILON = TIGHT_TOLERANCE;

  const polyLen = inPolygon.length;

  // inPt on polygon contour => immediate success    or
  // toggling of inside/outside at every single! intersection point of an edge
  //  with the horizontal line through inPt, left of inPt
  //  not counting lowerY endpoints of edges and whole edges on that line
  let inside = false;
  for (let p = polyLen - 1, q = 0; q < polyLen; p = q++) {
    let edgeLowPt = inPolygon[p];
    let edgeHighPt = inPolygon[q];

    let edgeDx = edgeHighPt.x - edgeLowPt.x;
    let edgeDy = edgeHighPt.y - edgeLowPt.y;

    if (Math.abs(edgeDy) > EPSILON) {			// not parallel
      if (edgeDy < 0) {
        edgeLowPt = inPolygon[q];
        edgeDx = -edgeDx;
        edgeHighPt = inPolygon[p];
        edgeDy = -edgeDy;
      }
      if ((inPt.y < edgeLowPt.y) || (inPt.y > edgeHighPt.y)) continue;

      if (inPt.y == edgeLowPt.y) {
        if (inPt.x == edgeLowPt.x) return true;		// inPt is on contour ?
        // continue;				// no intersection or edgeLowPt => doesn't count !!!
      } else {
        const perpEdge = edgeDy * (inPt.x - edgeLowPt.x) - edgeDx * (inPt.y - edgeLowPt.y);
        if (perpEdge == 0) return true;		// inPt is on contour ?
        if (perpEdge < 0) continue;
        inside = !inside;		// true intersection left of inPt
      }
    } else {		// parallel or colinear
      if (inPt.y != edgeLowPt.y) continue;			// parallel
      // egde lies on the same horizontal line as inPt
      if (((edgeHighPt.x <= inPt.x) && (inPt.x <= edgeLowPt.x)) ||
        ((edgeLowPt.x <= inPt.x) && (inPt.x <= edgeHighPt.x))) return true;	// inPt: Point on contour !
      // continue;
    }
  }

  return inside;
}

export function area(contour) {
  const n = contour.length;
  let a = 0.0;
  for (let p = n - 1, q = 0; q < n; p = q++) {
    a += contour[p].x * contour[q].y - contour[q].x * contour[p].y;
  }
  return a * 0.5;
}

export function isCCW(path2D) {
  return area(path2D) >= 0;
}

export function findLowestLeftPoint(poly) {
  let heroIdx = 0;
  for (let i = 1; i < poly.length; ++i) {
    const point = poly[i];
    const hero = poly[heroIdx];
    if (point.y < hero.y) {
      heroIdx = i;
    } else if (hero.y == point.y) {
      if (point.x < hero.x) {
        heroIdx = i;
      }
    }
  }
  return heroIdx;
}

export function perpendicularVector(v) {
  v = vec.normalize(v);
  return IDENTITY_BASIS3.map(axis => vec.cross(axis, v)).sort((a, b) => vec.lengthSq(b) - vec.lengthSq(a))[0];
}

export function radiusOfCurvature(d1, d2) {
  const r1lsq = vec.lengthSq(d1);
  const r1l = Math.sqrt(r1lsq);
  return r1lsq * r1l / vec.length(vec.cross(d1, d2));
}

export function pointToLineSignedDistance(ax, ay, bx, by, px, py) {
  let nx = -(by - ay);
  let ny = bx - ax;

  const d = distance(ax, ay, bx, by);

  nx /= d;
  ny /= d;

  const vx = px - ax;
  const vy = py - ay;

  const proj = vx * ny + vy * (-nx);

  //Check if vector b lays on the vector ab
  if (proj > d) {
    return Number.NaN;
  }

  if (proj < 0) {
    return Number.NaN;
  }
  return vx * nx + vy * ny;
}

export function lineLineIntersection2d(p1, p2, v1, v2) {

  // const n1 = perp2d(v1);
  const n2 = perp2d(v2);
  const cos = vec.dot(n2, v1);
  if (eqTol(cos, 0)) {
    return null;
  }
  const u1 = vec.dot(n2, vec.sub(p2, p1)) / cos;
  // const u2 = vec.dot(n1, vec.sub(p1, p2)) / vec.dot(n1, v2);

  return [p1[0] + v1[0] * u1, p1[1] + v1[1] * u1];
}

export function lineLineIntersection(p1, p2, v1, v2) {
  const zAx = v1.cross(v2);
  const n1 = zAx.cross(v1)._normalize();
  const n2 = zAx.cross(v2)._normalize();
  return {
    u1: n2.dot(p2.minus(p1)) / n2.dot(v1),
    u2: n1.dot(p1.minus(p2)) / n1.dot(v2),
  }
}

export function ConvexHull2D(points) {

  function removeMiddle(a, b, c) {
    const cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
    const dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y);
    return cross < 0 || cross == 0 && dot <= 0;
  }

  points.sort(function (a, b) {
    return a.x !== b.x ? a.x - b.x : a.y - b.y;
  });

  const n = points.length;
  const hull = [];

  for (let i = 0; i < 2 * n; i++) {
    const j = i < n ? i : 2 * n - 1 - i;
    while (hull.length >= 2 && removeMiddle(hull[hull.length - 2], hull[hull.length - 1], points[j])) {
      hull.pop();
    }
    hull.push(points[j]);
  }
  hull.pop();
  return hull;
}

export function centroid(set: Vec3[]): Vec3 {
  const result = newVector(3) as Vec3;
  set.forEach(p => vec._add(result, p));
  vec._div(result, 3);
  return result;
}