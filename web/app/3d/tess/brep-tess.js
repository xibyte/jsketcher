import libtess from 'libtess'
import Vector from "../../math/vector";
import {Face} from "../../brep/topo/face";
import BrepBuilder from "../../brep/brep-builder";

export default function A(face) {
  function asUV(p) {
    let uv = face.surface.verb.closestParam(p);
    uv.push(0);
    return uv;
  }

  function vertexCallback(data, out) {
    out.push(data);
  }


  const tessy = new libtess.GluTesselator();
  // tessy.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE, libtess.windingRule.GLU_TESS_WINDING_POSITIVE);
  tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);

  const mirrored = isMirrored(face.surface);

  if (mirrored) {
    tessy.gluTessNormal(0, 0, -1);
  } else {
    tessy.gluTessNormal(0, 0, 1);
  }

  const params = [];
  tessy.gluTessBeginPolygon(params);

  for (let loop of face.loops) {
    tessy.gluTessBeginContour();
    for (let e of loop.halfEdges) {
      let points = e.edge.curve.verb.tessellate();
      if (e.inverted) {
        points.reverse();
      }
      points.pop();
      for (let point of points) {
        let uv = asUV(point);
        tessy.gluTessVertex(uv, uv);
      }
    }
    tessy.gluTessEndContour();
  }
  tessy.gluTessEndPolygon();


  const triangles = [];
  for (let i = 0;  i < params.length; i += 3 ) {
    const a = params[i];
    const b = params[i + 1];
    const c = params[i + 2];
    triangles.push([a, b, c]);
  }
  analyzeCurvature(face.surface.verb, triangles);

  return triangles.map(t => t.map(p => face.surface.point(p[0], p[1])));
}

function analyzeCurvature(nurbs, triangles) {


  // nurbs
  //
  // const data = nurbs._data;
  //
  // for (let i = 1; i < data.knotsU.length - 2) {
  //   const u = data.knotsU[i];
  // }
  //
  // for (let tr of triangles) {
  //
  //   getCheckPoint(tr, data.knotsU)
  //
  //
  //
  // }
  //
  //
  //
  // const umax = data.knotsU[data.knotsU.length - 1];
  // const umin = data.knotsU[0];
  // const vmax = data.knotsV[data.knotsV.length - 1];
  // const vmin = data.knotsV[0];

  return triangles;

}

export function isMirrored(surface) {
  let a = surface.point(0, 0);
  let b = surface.point(1, 0);
  let c = surface.point(1, 1);
  return b.minus(a).cross(c.minus(a))._normalize().dot(surface.normalUV(0, 0)) < 0;
}



