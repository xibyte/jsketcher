import {PRIMITIVE_TYPES} from "engine/data/primitiveData";

export function getDeflection() {
  try {
    const s = JSON.parse(localStorage.getItem('ForgeCAD.settings') || '{}');
    return s.meshQuality ?? 0.05;
  } catch(e) { return 2; }
}
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

function faceTessToVerbose(ft) {
  const result = [];
  const hasNormals = ft.normals && ft.normals.length > 0;
  for (let i = 0; i < ft.indices.length; i += 3) {
    const i0 = ft.indices[i] * 3;
    const i1 = ft.indices[i + 1] * 3;
    const i2 = ft.indices[i + 2] * 3;
    result.push([
      [
        [ft.positions[i0],     ft.positions[i0 + 1], ft.positions[i0 + 2]],
        [ft.positions[i1],     ft.positions[i1 + 1], ft.positions[i1 + 2]],
        [ft.positions[i2],     ft.positions[i2 + 1], ft.positions[i2 + 2]],
      ],
      hasNormals ? [
        [ft.normals[i0],     ft.normals[i0 + 1], ft.normals[i0 + 2]],
        [ft.normals[i1],     ft.normals[i1 + 1], ft.normals[i1 + 2]],
        [ft.normals[i2],     ft.normals[i2 + 1], ft.normals[i2 + 2]],
      ] : null
    ]);
  }
  return result;
}

export function readShellData(data, consumed, csys) {
  try {
    const engine = __CAD_APP.services.craftEngine && __CAD_APP.services.craftEngine.modellingEngine;
    if (engine && data.ptr && data.faces && data.faces.length > 0) {
      const deflection = getDeflection();
      const newTess = engine.tessellate({model: data.ptr, deflection});
      if (newTess && newTess.faces && newTess.faces.length === data.faces.length) {
        newTess.faces.forEach((ft, i) => {
          if (ft.indices && ft.indices.length > 0) {
            data.faces[i].tess = faceTessToVerbose(ft);
          }
        });
      }
    }
  } catch(e) {
    // fallback to original tessellation on any error
  }
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
