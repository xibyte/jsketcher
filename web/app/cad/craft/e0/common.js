export const BOOLEAN_TYPES = {
  UNION : 1,
  SUBTRACT: 2,
  INTERSECT: 3
};

export const CURVE_TYPES = {
  SEGMENT: 1,
  B_SPLINE: 2,
  CIRCLE: 3,
  ARC: 4
};

export const DEFLECTION = 2;
export const E0_TOLERANCE = 1e-3;

export function singleShellRespone(oldShell, newShellData) {
  if (newShellData.error) {
    throw 'operation failed';
  }

  let consumed = [oldShell];
  let created = readShellData(newShellData, consumed, oldShell.csys);
  return {
    consumed: consumed,
    created: [created]
  };
}

export function readShellData(data, consumed, csys) {
  let tpi = __CAD_APP.services.tpi;
  let model = new tpi.scene.readShellEntityFromJson(data, consumed, csys);
  model.brepShell.data.externals.engine = 'e0';
  return model;
}

export function managedByE0(mShell) {
  let externals = mShell.brepShell && mShell.brepShell.data && mShell.brepShell.data.externals;
  return externals && externals.engine === 'e0';
}

export function readSketchContour(contour, face) {
  let tr = face.csys.outTransformation;
  let path = [];
  contour.segments.forEach(s => {
    if (s.isCurve) {
      if (s.constructor.name === 'Circle') {
        const dir = face.csys.z.data();
        path.push({TYPE: CURVE_TYPES.CIRCLE, c: tr.apply(s.c).data(), dir, r: s.r});
      } else if (s.constructor.name === 'Arc') {
        let a = s.inverted ? s.b : s.a;
        let b = s.inverted ? s.a : s.b;
        let tangent = tr._apply(s.c.minus(a))._cross(face.csys.z)._normalize();
        if (s.inverted) {
          tangent._negate();
        }
        path.push({
          TYPE: CURVE_TYPES.ARC,
          a: tr.apply(a).data(),
          b: tr.apply(b).data(),
          tangent: tangent.data()
        });
      } else {
        let nurbs = s.toNurbs(face.csys).impl;
        path.push(Object.assign({TYPE: CURVE_TYPES.B_SPLINE}, nurbs.serialize()));
      }
    } else {
      let ab = [s.a, s.b];
      if (s.inverted) {
        ab.reverse();
      }
      ab = ab.map(v => tr.apply(v).data());
      path.push({TYPE: CURVE_TYPES.SEGMENT, a: ab[0], b: ab[1]});
    }
  });
  return path;
}

export function readSketch(face, request, sketcher) {
  let sketch = sketcher.readSketch(face.id);
  if (!sketch) throw 'illegal state';
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
