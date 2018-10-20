import BrepBuilder, {createBoundingSurfaceFrom2DPoints, createBoundingSurfaceFromBBox} from '../brep-builder';
import VertexFactory from '../vertexFactory';
import NurbsSurface from '../geom/surfaces/nurbsSurface';
import * as vec from '../../math/vec';
import {BrepSurface} from '../geom/surfaces/brepSurface';
import {Plane} from '../geom/impl/plane';
import Vector from '../../../../modules/math/vector';
import NullSurface from '../geom/surfaces/nullSurface';
import BBox from '../../math/bbox';

export function readBrep(data) {
  
  let bb = new BrepBuilder();
  let vf = new VertexFactory();
  
  for (let faceData of data.faces) {
    bb.face();
    let nonDirect = faceData.surface.direct === false; // left handed coordinate system for planes
    let inverted = faceData.inverted !== nonDirect;
    bb._face.data.tesselation = {
      format: 'verbose',
      data: normalizeTesselationData(faceData.tess, inverted, faceData.surface.normal)
    };
    if (faceData.ref !== undefined) {
      bb._face.data.externals = {
        ref: faceData.ref
      }  
    }  
    
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
    bb._face.surface = readSurface(faceData.surface, inverted, bb._face)
  }
  //todo: data should provide full externals object
  bb._shell.data.externals = {
    ptr: data.ptr
  };
  return bb.build();
}

function readSurface(s, inverted, face) {
  let surface;
  if (s.TYPE === 'B-SPLINE') {
    surface = new BrepSurface(NurbsSurface.create(s.degU, s.degV, s.knotsU, s.knotsV, s.cp, s.weights), inverted);
  } else if (s.TYPE === 'PLANE') {
    
    let normal = new Vector().set3(s.normal);
    let plane = new Plane(normal, normal.dot(new Vector().set3(s.origin)));
    if (inverted) {
      plane = plane.invert();
    }
    let bBox = new BBox();

    let tr = plane.get2DTransformation();
    for (let he of face.outerLoop.halfEdges) {
      let tess = he.edge.data.tesselation ? he.edge.data.tesselation : he.edge.curve.tessellateToData();
      tess.forEach(p => bBox.checkData(tr.apply3(p)));
    }
    bBox.expand(10);
    surface = createBoundingSurfaceFromBBox(bBox, plane);
  } else {
    surface = new BrepSurface(new NullSurface());
  }
  return surface;
}

function readCurve(curve) {
  switch (curve.TYPE) {
    case 'B-SPLINE':
      console.dir(curve);
      
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
