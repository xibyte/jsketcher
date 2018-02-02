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

  let plane = face.surface().tangentPlane(0, 0);
  const details = getEncloseDetails(params, sketch.fetchContours(), plane, !cut, false);
  const operand = combineShells(details.map(d => enclose(d.basePath, d.lidPath, d.baseSurface, d.lidSurface)));
  return BooleanOperation(face, solid, operand, cut ? 'subtract' : 'union');
}

export function getEncloseDetails(params, contours, sketchSurface, invert) {
  let value = params.value;
  if (value < 0) {
    value = Math.abs(value);
    invert = !invert;
  }

  const baseSurface = invert ? sketchSurface.invert() : sketchSurface;

  let target;
  
  let baseSurfaceNormal = baseSurface.normal;

  const targetDir = baseSurfaceNormal.negate();

  if (params.rotation !== 0) {
    const basis = sketchSurface.basis();
    target = Matrix3.rotateMatrix(params.rotation * Math.PI / 180, basis[0], ORIGIN).apply(targetDir);
    if (params.angle !== 0) {
      target = Matrix3.rotateMatrix(params.angle * Math.PI / 180, basis[2], ORIGIN)._apply(target);
    }
    target._multiply(value);
  } else {
    target = targetDir.multiply(value);
  }

  let details = [];
  for (let contour of contours) {
    if (invert) contour.reverse();
    const basePath = contour.transferOnSurface(sketchSurface);
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

    const lidSurface = baseSurface.translate(target).invert();
    details.push({basePath, lidPath, baseSurface, lidSurface});
  }
  return details;
}