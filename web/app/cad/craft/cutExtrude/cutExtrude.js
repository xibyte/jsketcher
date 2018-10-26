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

  const details = getEncloseDetails(params, sketch.fetchContours(), face.csys, face.surface, !cut, false);
  const operand = combineShells(details.map(d => enclose(d.basePath, d.lidPath, d.baseSurface, d.lidSurface)));
  return BooleanOperation(face, solid, operand, cut ? 'subtract' : 'union');
}

export function getEncloseDetails(params, contours, csys, sketchSurface, invert) {
  let value = params.value;
  if (value < 0) {
    value = Math.abs(value);
    invert = !invert;
  }

  const targetDir = invert ? csys.z : csys.z.negate();
  
  let target;

  if (params.rotation !== 0) {
    target = Matrix3.rotateMatrix(params.rotation * Math.PI / 180, csys.x, ORIGIN).apply(targetDir);
    if (params.angle !== 0) {
      target = Matrix3.rotateMatrix(params.angle * Math.PI / 180, csys.z, ORIGIN)._apply(target);
    }
    target._multiply(value);
  } else {
    target = targetDir.multiply(value);
  }

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