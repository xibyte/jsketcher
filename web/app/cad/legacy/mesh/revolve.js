import Vector from 'math/vector';
import {createShared} from '../../cad-utils'
import {TriangulatePolygons} from '../../tess/triangulation';
import {Matrix3x4} from "math/matrix";
import {distanceAB3} from "math/distance";
import {equal} from "math/equality";

function Group(derivedFrom) {
  this.polygons = [];
  this.derivedFrom = derivedFrom;
}

export default function revolve(polygons, axisSegment, angle, resolution) {
  const groups = {};
  const out = [];
  let lids = revolveIterator(polygons, axisSegment, angle, resolution, (pOrig, pRot, p, q, reverse, segmentId) => {
    const polygon = [pOrig[p], pOrig[q]];
    
    //skip point if they are on the axis of revolving
    if (!equal(0, distanceAB3(pOrig[q], pRot[q]))) {
      polygon.push(pRot[q]);
    }
    if (!equal(0, distanceAB3(pOrig[p], pRot[p]))) {
      polygon.push(pRot[p]);
    }
    if (polygon.length < 3) {
      return;
    }
    if (reverse) {
      polygon.reverse(); //fixes CCW order
    }

    let shared = createShared();
    let sketchConnectionObject = pOrig[p].sketchConnectionObject;
    if (sketchConnectionObject) {
      if (sketchConnectionObject.TYPE === 'Segment') {
        sketchConnectionObject = Object.assign({}, sketchConnectionObject, {
          TYPE: 'Arc',
          id: sketchConnectionObject.id + ":REVOLVED" // just avoid having object with the same ID but different classes
        });
      }
      shared.__tcad.csgInfo = {derivedFrom:  sketchConnectionObject};
      pRot[p].sketchConnectionObject = sketchConnectionObject;
    }
    
    const face = csgPolygon(polygon, shared);
    out.push(face);
  });
  if (!equal(_360, angle)) {
    if (angle < 0) {
      let t = lids;
      lids = polygons;
      polygons = t;
    } 
    lids.forEach(p => out.push(csgPolygon(p, createShared())));
    polygons.forEach(p => out.push(csgPolygon(p.slice().reverse(), createShared())));
  } 
  return out;
}

export function revolveToWireframe(polygons, axisSegment, angle, resolution) {
  const out = [];
  //add initial polygon
  addAsSegments(out, polygons);
  revolveIterator(polygons, axisSegment, angle, resolution, (pOrig, pRot, p, q) => {
    out.push([pRot[p], pRot[q]]);
    addIfNonZero(out, [pOrig[q], pRot[q]]);
    addIfNonZero(out, [pOrig[p], pRot[p]]);
  });
  return out;
}

export function revolveToTriangles(polygons, axisSegment, angle, resolution, triangulateBases) {
  const out = [];
  let lidNormal = null, baseNormal = null;
  //add initial polygon
  let lids = revolveIterator(polygons, axisSegment, angle, resolution, (pOrig, pRot, p, q, r, id, i, length) => {
    //skip point if they are on the axis of revolving
    if (!equal(0, distanceAB3(pOrig[q], pRot[q]))) {
      out.push( [pOrig[p], pOrig[q], pRot[q]] );
    }
    if (!equal(0, distanceAB3(pOrig[p], pRot[p]))) {
      out.push( [ pRot[q],  pRot[p], pOrig[p]] );
    }
    let last = i === length - 1
    if (last && !lidNormal) {
      lidNormal = pRot[q].minus(pOrig[q])._normalize();
    }
    if (i === 0 && !baseNormal) {
      baseNormal = pRot[q].minus(pOrig[q])._normalize()
    }
  });
  if (triangulateBases && lidNormal && baseNormal) {
    function triangulatePolygons(polygons, normal) {
      TriangulatePolygons(polygons, normal, (v) => v.toArray(), (arr) => new Vector().set3(arr))
        .forEach(tr => out.push(tr));
    }
    triangulatePolygons(lids, lidNormal);
    triangulatePolygons(polygons, baseNormal);
    
  }

  if (angle < 0) {
    out.forEach(tr => tr.reverse());
  }
  return out;
}

export function revolveIterator(polygons, axisSegment, angle, resolution, callback) {
  
  if (resolution < 2) resolution = 2;
  const reverse = angle < 0;
  angle = Math.abs(angle);
  if (angle > _360) {
    angle = _360;
  }
  
  const angleStep = angle / resolution * (reverse ? -1 : 1);
  const axis = new Vector().setV(axisSegment[1])._minus(axisSegment[0]);
  const tr = Matrix3x4.rotateMatrix(angleStep, axis, axisSegment[0]);
  
  for (let resIndex = 0; resIndex < resolution; resIndex++) {
    let rotatedPolygons = polygons.map(poly => poly.map(point => tr.apply(point)));
    let segmentId = 0;
    for (let i = 0; i < polygons.length; i++) {
      const pOrig = polygons[i];      
      const pRot = rotatedPolygons[i];
      const n = pOrig.length;
      for (let p = n - 1, q = 0; q < n; p = q ++) {
        callback(pOrig, pRot, p, q, reverse, segmentId ++, resIndex, resolution);
      }
    }
    polygons = rotatedPolygons;
  }
  return polygons;
}


function addIfNonZero(out, seg) {
  if (!equal(0, distanceAB3(seg[0], seg[1]))) {
    out.push(seg);
  }
}

function addAsSegments(out, polygons) {
  for (let poly of polygons) {
    for (let p = poly.length - 1, q = 0; q < poly.length; p = q ++) {
      out.push([poly[p], poly[q]]);
    }
  }
}

function csgPolygon(points, shared) {
  return new CSG.Polygon(points.map(p => new CSG.Vertex(p.csg())), shared);
}

const _360 = 2 * Math.PI;
