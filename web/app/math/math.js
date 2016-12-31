import Vector from './vector'
import BBox from './bbox'

export const TOLERANCE = 1E-6;

export function distanceAB(a, b) {
  return distance(a.x, a.y, b.x, b.y);
}

export function distance(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceAB3(a, b) {
  return distance3(a.x, a.y, a.z, b.x, b.y, b.z);
}

export function distance3(x1, y1, z1, x2, y2, z2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  var dz = z1 - z2;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function circleFromPoints(p1, p2, p3) {
  var center = new Vector();
  var offset = p2.x*p2.x + p2.y*p2.y;
  var bc =   ( p1.x*p1.x + p1.y*p1.y - offset )/2.0;
  var cd =   (offset - p3.x*p3.x - p3.y*p3.y)/2.0;
  var det =  (p1.x - p2.x) * (p2.y - p3.y) - (p2.x - p3.x)* (p1.y - p2.y);

  if (Math.abs(det) < TOLERANCE) { return null; }

  var idet = 1/det;

  center.x =  (bc * (p2.y - p3.y) - cd * (p1.y - p2.y)) * idet;
  center.y =  (cd * (p1.x - p2.x) - bc * (p2.x - p3.x)) * idet;
  return center;
}

export function norm2(vec) {
  var sq = 0;
  for (var i = 0; i < vec.length; i++) {
    sq += vec[i] * vec[i];
  }
  return Math.sqrt(sq);  
}

export function areEqual(v1, v2, tolerance) {
  return Math.abs(v1 - v2) < tolerance;
}

export function areVectorsEqual(v1, v2, tolerance) {
  return areEqual(v1.x, v2.x, tolerance) &&
         areEqual(v1.y, v2.y, tolerance) &&
         areEqual(v1.z, v2.z, tolerance);
}

export function vectorsEqual(v1, v2) {
  return areVectorsEqual(v1, v2, TOLERANCE);
}

export function equal(v1, v2) {
  return areEqual(v1, v2, TOLERANCE);
}

export function strictEqual(a, b) {
  return a.x == b.x && a.y == b.y && a.z == b.z;
}

export function _vec(size) {
  var out = [];
  out.length = size;
  for (var i = 0; i < size; ++i) {
    out[i] = 0;
  }
  return out;
}

export function _matrix(m, n) {
  var out = [];
  out.length = m;
  for (var i = 0; i < m; ++i) {
    out[i] = _vec(n);
  }
  return out;
}

export function rotate(px, py, angle) {
  return rotateInPlace(px, py, angle, new Vector());
}

export function rotateInPlace(px, py, angle, out) {
  out.x =  px * Math.cos(angle) - py * Math.sin(angle);
  out.y =  px * Math.sin(angle) + py * Math.cos(angle);
  return out;
}

export function polygonOffsetXY(polygon, scaleX, scaleY) {
  const origBBox = new BBox();
  const scaledBBox = new BBox();
  const result = [];
  for (let point of polygon) {
    const scaledPoint = new Vector(point.x * scaleX, point.y * scaleY);
    result.push(scaledPoint);
    origBBox.checkPoint(point);
    scaledBBox.checkPoint(scaledPoint);
  }
  const alignVector = scaledBBox.center()._minus(origBBox.center());
  for (let point of result) {
    point._minus(alignVector);
  }
  return result;
}


export function polygonOffset( polygon, scale ) {
  return polygonOffsetXY( polygon, scale, scale );
}

export function polygonOffsetByDelta( polygon, delta ) {
  const origBBox = new BBox();
  for (let point of polygon) {
    origBBox.checkPoint(point);
  }
  const width = origBBox.width();
  const height = origBBox.height();
  return polygonOffsetXY(polygon, (width + delta) / width, (height + delta) / height);
}

export function isPointInsidePolygon( inPt, inPolygon ) {
  var EPSILON = TOLERANCE;

  var polyLen = inPolygon.length;

  // inPt on polygon contour => immediate success    or
  // toggling of inside/outside at every single! intersection point of an edge
  //  with the horizontal line through inPt, left of inPt
  //  not counting lowerY endpoints of edges and whole edges on that line
  var inside = false;
  for( var p = polyLen - 1, q = 0; q < polyLen; p = q ++ ) {
    var edgeLowPt  = inPolygon[ p ];
    var edgeHighPt = inPolygon[ q ];

    var edgeDx = edgeHighPt.x - edgeLowPt.x;
    var edgeDy = edgeHighPt.y - edgeLowPt.y;

    if ( Math.abs(edgeDy) > EPSILON ) {			// not parallel
      if ( edgeDy < 0 ) {
        edgeLowPt  = inPolygon[ q ]; edgeDx = - edgeDx;
        edgeHighPt = inPolygon[ p ]; edgeDy = - edgeDy;
      }
      if ( ( inPt.y < edgeLowPt.y ) || ( inPt.y > edgeHighPt.y ) ) 		continue;

      if ( inPt.y == edgeLowPt.y ) {
        if ( inPt.x == edgeLowPt.x )		return	true;		// inPt is on contour ?
        // continue;				// no intersection or edgeLowPt => doesn't count !!!
      } else {
        var perpEdge = edgeDy * (inPt.x - edgeLowPt.x) - edgeDx * (inPt.y - edgeLowPt.y);
        if ( perpEdge == 0 )				return	true;		// inPt is on contour ?
        if ( perpEdge < 0 ) 				continue;
        inside = ! inside;		// true intersection left of inPt
      }
    } else {		// parallel or colinear
      if ( inPt.y != edgeLowPt.y ) 		continue;			// parallel
      // egde lies on the same horizontal line as inPt
      if ( ( ( edgeHighPt.x <= inPt.x ) && ( inPt.x <= edgeLowPt.x ) ) ||
        ( ( edgeLowPt.x <= inPt.x ) && ( inPt.x <= edgeHighPt.x ) ) )		return	true;	// inPt: Point on contour !
      // continue;
    }
  }

  return	inside;
}

// http://en.wikipedia.org/wiki/Shoelace_formula
export function area(contour) {
  var n = contour.length;
  var a = 0.0;
  for ( var p = n - 1, q = 0; q < n; p = q ++ ) {
    a += contour[ p ].x * contour[ q ].y - contour[ q ].x * contour[ p ].y;
  }
  return a * 0.5;
}

export function isCCW(path2D) {
  return area(path2D) >= 0;
}

export const sq = (a) => a * a;
