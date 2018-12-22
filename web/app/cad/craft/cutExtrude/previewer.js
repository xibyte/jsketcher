
import {getEncloseDetails, resolveExtrudeVector} from './cutExtrude';
import {curveTessParams} from "../../../brep/geom/impl/curve/curve-tess";
import Vector from "math/vector";
import {TriangulatePolygons} from "../../tess/triangulation";
import {createMeshGeometry} from "scene/geoms";


export function createPreviewGeomProvider(inversed) {
  
  return function previewGeomProvider(params, services) {

    const face = services.cadRegistry.findFace(params.face);
    if (!face || !face.sketch) return null;
    let sketch = face.sketch.fetchContours();
    let vector = resolveExtrudeVector(services.cadRegistry, face, params, !inversed);
    const encloseDetails = getEncloseDetails(params, sketch, vector, face.csys, face.surface, !inversed);
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
        for (let j = 0; j < base.length - 1; j++) {
          basePoints.push(base[j]);
          lidPoints.push(base[j]);
        }
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

