import {enclose} from 'brep/operations/brep-enclose'
import {BooleanOperation, combineShells} from '../booleanOperation'
import {Matrix3x4} from 'math/matrix';
import {equal} from 'math/equality';


export function Extrude(params, ctx) {
  // return doOperation(params, ctx, false);

  return ctx.craftEngine.cutExtrude(false, params);
}

export function Cut(params, ctx) {

  // return doOperation(params, ctx, true);

  return ctx.craftEngine.cutExtrude(true, params);
}

export function doOperation(params, ctx, cut) {
  const {cadRegistry, sketchStorageService} = ctx;
  const face = cadRegistry.findFace(params.face);
  const solid = face.solid;

  let sketch = sketchStorageService.readSketch(face.id);
  if (!sketch) throw 'sketch not found for the face ' + face.id;

  let vector = resolveExtrudeVector(cadRegistry, face, params, !cut);
  const details = getEncloseDetails(params, sketch.fetchContours(), vector, face.csys, face.surface, !cut, false);
  const operand = combineShells(details.map(d => enclose(d.basePath, d.lidPath, d.baseSurface, d.lidSurface)));
  return BooleanOperation(face, solid, operand, cut ? 'subtract' : 'union');
}

export function resolveExtrudeVector(cadRegistry, face, params, invert) {
  let vector = null;
  if (params.datumAxisVector) {
    const datumAxis = cadRegistry.findDatumAxis(params.datumAxisVector);
    if (datumAxis) {
      vector = datumAxis.dir;
      invert = false;
    }
  } else if (params.edgeVector) {
    const edge = cadRegistry.findEdge(params.edgeVector);
    const curve = edge.brepEdge.curve;
    if (curve.degree === 1) {
      vector = edge.brepEdge.curve.tangentAtParam(edge.brepEdge.curve.uMin);
      if (vector.dot(face.csys.z) < 0 === invert) {
        vector = vector.negate();
      }
      invert = false;
    }
  } else if (params.sketchSegmentVector) {
    const mSegment = cadRegistry.findSketchObject(params.sketchSegmentVector);
    if (mSegment.sketchPrimitive.isSegment) {
      let [a, b] = mSegment.sketchPrimitive.tessellate().map(mSegment.face.sketchToWorldTransformation.apply);
      vector = b.minus(a)._normalize();
      if (vector.dot(face.csys.z) < 0 === invert) {
        vector._negate();
      }
      invert = false;
    }
  }
  if (!vector) {
    invert = !invert;  
    vector = face.csys.z; 
  }
  
  if (params.flip) {
    invert = !invert;
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
    let applyPrism = !equal(params.prism, 1);
    let prismTr = null;
    if (applyPrism) {
      prismTr = new Matrix3x4();
      prismTr.scale(params.prism, params.prism, params.prism);
    }
    for (let i = 0; i < basePath.length; ++i) {
      const curve = basePath[i];
      let lidCurve = curve.translate(target);
      if (applyPrism) {
        lidCurve = lidCurve.transform(prismTr);
      }
      lidPath.push(lidCurve);
    }

    const baseSurface = sketchSurface.tangentPlane(0, 0);
    const lidSurface = baseSurface.translate(target).invert();
    details.push({basePath, lidPath, baseSurface, lidSurface});
  }
  return details;
}