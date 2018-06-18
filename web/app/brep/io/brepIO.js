import BrepBuilder, {createBoundingSurfaceFrom2DPoints} from '../brep-builder';
import VertexFactory from '../vertexFactory';
import NurbsSurface from '../geom/surfaces/nurbsSurface';
import * as vec from '../../math/vec';
import {BrepSurface} from '../geom/surfaces/brepSurface';
import {Plane} from '../geom/impl/plane';
import Vector from '../../../../modules/math/vector';
import NullSurface from '../geom/surfaces/nullSurface';

export function readBrep(data) {
  
  let bb = new BrepBuilder();
  let vf = new VertexFactory();
  
  for (let faceData of data.faces) {
    bb.face(readSurface(faceData.surface, faceData.inverted));
    bb._face.data.tesselation = {
      format: 'verbose',
      data: normalizeTesselationData(faceData.tess, faceData.inverted, faceData.surface.normal)
    };
      
    for (let loop of faceData.loops) {
      bb.loop();
      for (let edgeData of loop) {
        let a = vf.getData(edgeData.inverted ? edgeData.b : edgeData.a);
        let b = vf.getData(edgeData.inverted ? edgeData.a : edgeData.b);
        bb.edge(a, b, () => readCurve(edgeData.curve), edgeData.inverted,  edgeData.edgeRef);
        bb.lastHalfEdge.edge.data.tesselation = edgeData.tess;
        //todo: data should provide full externals object
        bb.lastHalfEdge.edge.data.externals = {
          ptr: edgeData.ptr
        };
      }
    }
  }
  //todo: data should provide full externals object
  bb._shell.data.externals = {
    ptr: data.ptr
  };
  return bb.build();
}

function readSurface(s, inverted) {
  let surface;
  if (s.TYPE === 'B-SPLINE') {
    surface = new BrepSurface(NurbsSurface.create(s.degU, s.degV, s.knotsU, s.knotsV, s.cp, s.weights), inverted);
  } else if (s.TYPE === 'PLANE') {
    //TODO create bounded nurbs from face vertices when they are available
    let fakeBounds = [
      new Vector(0,0,0), new Vector(0,100,0), new Vector(100,100,0), new Vector(100,0,0)
    ];
    let normal = new Vector().set3(s.normal);
    let plane = new Plane(normal, normal.dot(new Vector().set3(s.origin)));
    if (inverted) {
      plane = plane.invert();
    }
    surface = createBoundingSurfaceFrom2DPoints(fakeBounds, plane);
  } else {
    surface = new BrepSurface(new NullSurface());
  }
  return surface;
}

function readCurve(curve) {
  switch (curve.TYPE) {
    case 'CONIC':
      //...
    case 'LINE':
    default:
      return undefined;
  }
}

export function normalizeTesselationData(tessellation, inverted, surfaceNormal) {
  let tess = [];
  for (let i = 0; i < tessellation.length; ++i) {
    let [tr, normales] = tessellation[i];
    tr = tr.slice();
    if (normales) {
      let normalesValid = !normales.find(n => n[0] === null || n[1] === null || n[2] === null);
      if (!normalesValid) {
        normales = undefined;
      } else {
        if (inverted) {
          normales = normales.map(n => vec.negate(n));
        } else {
          normales = normales.slice();
        }
      }      
    }
    if (inverted) {
      tr.reverse();
      if (normales) {
        normales.reverse();
      }
    }
    tess.push([tr, normales]);
  }
  if (surfaceNormal && inverted) {
    surfaceNormal = vec.negate(surfaceNormal);
  }

  for (let [tr, normales] of tess) {
    if (normales) {
      let trNormal = vec.normal3(tr);
      let testNormal = normalizedSum(normales);
      if (vec.dot(testNormal, trNormal) < 0) {
        tr.reverse();
        normales.reverse();
      }
    } else if (surfaceNormal) {
      let trNormal = vec.normal3(tr);
      if (vec.dot(surfaceNormal, trNormal) < 0) {
        tr.reverse();
      }
    }
  }
  return tess;
}

function normalizedSum(vecs) {
  let out = [0,0,0];
  vecs.forEach(v => vec._add(out, v));
  vec._normalize(out);
  return out;
}
