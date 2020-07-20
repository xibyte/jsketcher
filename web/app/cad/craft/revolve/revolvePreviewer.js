import {createMeshGeometry} from 'scene/geoms';
import {DEG_RAD} from 'math/commons';
import {revolveToTriangles} from '../../legacy/mesh/revolve';

let cache = {};

export function revolvePreviewGeomProvider(params, services) {

  const face = services.cadRegistry.findFace(params.face);
  const axisModel = services.cadRegistry.findSketchObject(params.axis);
  const axis = axisModel.sketchPrimitive;
  if (!face || !face.sketch || !axis) return null;
  let contours = face.sketch.fetchContours();

  let polygons = [];
  for (let contour of contours) {
    const curves = contour.transferInCoordinateSystem(face.csys);
    let polygon = [];
    for (let curve of curves) {
      let points = curve.tessellate();
      for (let i = 0; i < points.length - 1; i++) {
        polygon.push(points[i]);
      }
    }
    polygons.push(polygon);
  }

  let angle = params.angle * DEG_RAD;
  let tr = face.csys.outTransformation.apply;
  const triangles = revolveToTriangles(polygons, [tr(axis.a), tr(axis.b)], angle, defaultResolution(params.angle), true);
  return createMeshGeometry(triangles);
}

function defaultResolution(angle) {
  return Math.max(2, Math.round(Math.abs(angle) / 4.0));
}
