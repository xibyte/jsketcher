
import {getEncloseDetails} from "./cutExtrude";
import {curveTessParams} from "../../../brep/geom/impl/curve/curve-tess";
import Vector from "math/vector";
import {TriangulatePolygons} from "../../tess/triangulation";
import {createMeshGeometry} from "scene/geoms";


export function createPreviewGeomProvider(inversed) {
  
  return function previewGeomProvider(params, services) {

    const face = services.cadRegistry.findFace(params.face);
    if (!face) return null;
    let sketch = face.sketch.fetchContours();

    const encloseDetails = getEncloseDetails(params, sketch, face.csys, face.surface, !inversed);
    const triangles = [];

    for (let {basePath, lidPath, baseSurface, lidSurface} of encloseDetails) {
      const basePoints = [];
      const lidPoints = [];
      for (let i = 0; i < basePath.length; ++i) {
        let baseNurbs = basePath[i];
        let lidNurbs = lidPath[i];

        let tessCurve = params.prism > 1 ? lidNurbs : baseNurbs;

        const us = curveTessParams(tessCurve.impl, tessCurve.uMin, tessCurve.uMax);
        const base = us.map(u => baseNurbs.point(u));
        const lid = us.map(u => lidNurbs.point(u));
        const n = base.length;
        for (let p = n - 1, q = 0; q < n; p = q++) {
          triangles.push([base[p], base[q], lid[q]]);
          triangles.push([lid[q], lid[p], base[p]]);
        }
        base.forEach(p => basePoints.push(p));
        lid.forEach(p => lidPoints.push(p));
      }

      function collectOnSurface(points, normal) {
        TriangulatePolygons([points], normal, (v) => v.toArray(), (arr) => new Vector().set3(arr))
          .forEach(tr => triangles.push(tr));
      }

      collectOnSurface(basePoints, baseSurface.normal);
      collectOnSurface(lidPoints, lidSurface.normal);
    }

    return createMeshGeometry(triangles);
  }
}

