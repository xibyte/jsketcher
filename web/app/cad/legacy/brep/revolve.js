import {BooleanOperation, combineShells} from './boolean-operation'
import {ReadSketchFromFace} from '../../sketch/sketchReader'
import {revolve} from 'brep/brep-builder'

export function Revolve(app, params) {

  const face = app.findFace(params.face);
  const solid = face.solid;
  const surface = face.surface;

  const sketch = ReadSketchFromFace(app, face);
  const pivot = evalPivot(params.pivot, sketch, face.csys);

  const shells = [];
  const contours = sketch.fetchContours();
  for (let contour of contours) {
    const basePath = contour.transferInCoordinateSystem(face.csys);
    const shell = revolve(basePath, surface, pivot.p0, pivot.v, params.angle);
    shells.push(shell);
  }

  const operand = combineShells(shells);
  return BooleanOperation(face, solid, operand, 'union');
}

export function evalPivot(pivot, sketch, csys) {
  const segment = sketch.findById(pivot);
  if (segment == null) {
    return null;
  }
  const tr = csys.outTransformation;
  const p0 = tr.apply(segment.a);
  const v = tr.apply(segment.b).minus(p0)._normalize();
  return {p0, v}
}
