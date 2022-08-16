import {PRIMITIVE_TYPES} from "engine/data/primitiveData";

export const DEFLECTION = 2;
export const E0_TOLERANCE = 1e-3;

export function singleShellRespone(oldShell, newShellData) {
  if (newShellData.error) {
    throw 'operation failed';
  }

  const consumed = [oldShell];
  const created = readShellData(newShellData, consumed, oldShell.csys);
  return {
    consumed: consumed,
    created: [created]
  };
}

export function readShellData(data, consumed, csys) {
  const exposure = __CAD_APP.services.exposure;
  const model = new exposure.scene.readShellEntityFromJson(data, consumed, csys);
  model.brepShell.data.externals.engine = 'e0';
  return model;
}

export function managedByE0(mShell) {
  const externals = mShell.brepShell && mShell.brepShell.data && mShell.brepShell.data.externals;
  return externals && externals.engine === 'e0';
}

export function readSketchContour(contour, face) {
  const tr = face.csys.outTransformation;
  const path = [];
  contour.segments.forEach(s => {
    if (s.isCurve) {
      if (s.constructor.name === 'Circle') {
        const dir = face.csys.z.data();
        path.push({TYPE: PRIMITIVE_TYPES.CIRCLE, c: tr.apply(s.c).data(), dir, r: s.r});
      } else if (s.constructor.name === 'Arc') {
        const a = s.inverted ? s.b : s.a;
        const b = s.inverted ? s.a : s.b;
        const tangent = tr._apply(s.c.minus(a))._cross(face.csys.z)._normalize();
        if (s.inverted) {
          tangent._negate();
        }
        path.push({
          TYPE: PRIMITIVE_TYPES.ARC,
          a: tr.apply(a).data(),
          b: tr.apply(b).data(),
          tangent: tangent.data()
        });
      } else {
        const nurbs = s.toNurbs(face.csys).impl;
        path.push(Object.assign({TYPE: PRIMITIVE_TYPES.B_SPLINE}, nurbs.serialize()));
      }
    } else {
      let ab = [s.a, s.b];
      if (s.inverted) {
        ab.reverse();
      }
      ab = ab.map(v => tr.apply(v).data());
      path.push({TYPE: PRIMITIVE_TYPES.SEGMENT, a: ab[0], b: ab[1]});
    }
    path[path.length - 1].id = s.id;
  });
  return path;
}

export function readSketch(face, request, sketchStorageService) {
  const sketch = sketchStorageService.readSketch(face.id);
  if (!sketch) throw 'sketch not found for the face ' + face.id;
  return sketch.fetchContours().map(c => readSketchContour(c, face));
}

export function shellsToPointers(shells) {
  return shells.filter(managedByE0).map(m => m.brepShell.data.externals.ptr);
}

export function writeCsys(csys, swapToY) {
  return {
    origin: csys.origin.data(),
    normal: (swapToY ? csys.y : csys.z).data(),
    xDir: csys.x.data()
  };
}
