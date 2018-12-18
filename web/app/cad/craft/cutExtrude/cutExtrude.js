import {Matrix3, ORIGIN} from '../../../math/l3space'
import * as math from '../../../math/math'
import {enclose} from '../../../brep/brep-enclose'
import {BooleanOperation, combineShells} from '../booleanOperation'


export function Extrude(params, sketcher) {
  return doOperation(params, sketcher, false);
}

export function Cut(params, sketcher) {
  return doOperation(params, sketcher, true);
}

export function doOperation(params, {cadRegistry, sketcher}, cut) {
  const face = cadRegistry.findFace(params.face);
  const solid = face.solid;

  let sketch = sketcher.readSketch(face.id);
  if (!sketch) throw 'illegal state';

  let vector = resolveExtrudeVector(cadRegistry, face, params, !cut);
  const details = getEncloseDetails(params, sketch.fetchContours(), vector, face.csys, face.surface, !cut, false);
  const operand = combineShells(details.map(d => enclose(d.basePath, d.lidPath, d.baseSurface, d.lidSurface)));
  return BooleanOperation(face, solid, operand, cut ? 'subtract' : 'union');
}

export function resolveExtrudeVector(cadRegistry, face, params, invert) {
  let vector = null;
  if (params.vector) {
    const datumAxis = cadRegistry.findDatumAxis(params.vector);
    if (datumAxis) {
      vector = datumAxis.dir;
      invert = false;
    }
  }
  if (!vector) {
    invert = !invert;  
    vector = face.csys.z; 
  }
  
  let value = params.value;
  if (value < 0) {
    value = Math.abs(value);
    invert = !invert;
  }

  if (invert) {
    vector = vector.negate();
  }
  
  return vector.multiply(value);
}

export function getEncloseDetails(params, contours, target, csys, sketchSurface, invert) {
  let details = [];
  for (let contour of contours) {
    if (invert) contour.reverse();
    const basePath = contour.transferInCoordinateSystem(csys);
    if (invert) contour.reverse();

    const lidPath = [];
    let applyPrism = !math.equal(params.prism, 1);   
    for (let i = 0; i < basePath.length; ++i) {
      const curve = basePath[i];
      let lidCurve = curve.translate(target);
      if (applyPrism) {
        lidCurve = lidCurve.offset(params.prism);
      }
      lidPath.push(lidCurve);
    }

    const baseSurface = sketchSurface.tangentPlane(0, 0);
    const lidSurface = baseSurface.translate(target).invert();
    details.push({basePath, lidPath, baseSurface, lidSurface});
  }
  return details;
}