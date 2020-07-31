import BrepBuilder, {createBoundingSurfaceFromBBox} from '../brep-builder';
import VertexFactory from '../vertexFactory';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import * as vec from 'math/vec';
import {Vec3} from 'math/vec';
import {BrepSurface} from 'geom/surfaces/brepSurface';
import {Plane} from 'geom/impl/plane';
import Vector from 'math/vector';
import NullSurface from 'geom/surfaces/nullSurface';
import BBox from 'math/bbox';
import NurbsCurve from 'geom/curves/nurbsCurve';
import BrepCurve from 'geom/curves/brepCurve';
import {BrepOutputData, EdgeData, FaceData} from "engine/data/brepOutputData";
import {ProductionInfo} from "engine/productionInfo";
import {Tessellation1D} from "engine/tessellation";
import {Shell} from "brep/topo/shell";

//Extensions for topo objects
declare module '../topo/shell' {

  interface Shell {
    data: {
      externals: {
        ptr?: number
      }
    }
  }
}

declare module '../topo/face' {

  interface Face {
    data: {
      id: string,
      productionInfo: ProductionInfo,
      tessellation: {
        format: string,
        data: any;
      }
      externals: {
        ref: number
      }
    }
  }
}

declare module '../topo/edge' {

  interface Edge {
    data: {
      tessellation: Tessellation1D<Vec3>
      externals: {
        ptr?: number
      }
    }
  }
}

export function readBrep(data: BrepOutputData) {
  
  let bb = new BrepBuilder();
  let vf = new VertexFactory();
  
  for (let faceData of data.faces) {
    bb.face();
    let nonDirect = faceData.surface.direct === false; // left handed coordinate system for planes
    let inverted = faceData.inverted !== nonDirect;
    bb._face.data.tessellation = {
      format: 'verbose',
      data: normalizetessellationData(faceData.tess, inverted, faceData.surface.TYPE === 'PLANE' ? faceData.surface.normal : undefined)
    };
    bb._face.data.productionInfo = faceData.productionInfo;
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
        bb.lastHalfEdge.edge.data.tessellation = edgeData.tess;
        //todo: data should provide full externals object
        bb.lastHalfEdge.edge.data.externals = {
          ptr: edgeData.ptr
        };
      }
    }
    try {
      bb._face.surface = readSurface(faceData.surface, faceData.inverted, inverted, bb._face);
    } catch (e) {
      console.error(e);
      bb._face.surface = new BrepSurface(new NullSurface());
    }
  }
  //todo: data should provide full externals object
  bb._shell.data.externals = {
    ptr: data.ptr
  };
  return bb.build();
}

function readSurface(s, faceInverted, effectivelyInverted, face) {
  let surface;
  if (s.TYPE === 'B-SPLINE') {
    surface = new BrepSurface(NurbsSurface.create(s.degU, s.degV, s.knotsU, s.knotsV, s.cp, s.weights), faceInverted);
    surface._mirrored = !s.direct;
  } else if (s.TYPE === 'PLANE') {
    
    let normal = new Vector().set3(s.normal);
    let plane = new Plane(normal, normal.dot(new Vector().set3(s.origin)));
    if (effectivelyInverted) {
      plane = plane.invert();
    }
    let bBox = new BBox();

    let tr = plane.get2DTransformation();
    for (let he of face.outerLoop.halfEdges) {
      let tess = he.edge.data.tessellation ? he.edge.data.tessellation : he.edge.curve.tessellateToData();
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
      return new BrepCurve(NurbsCurve.create(curve.deg, curve.knots, curve.cp, curve.weights));
    case 'CONIC':
      //...
    case 'LINE':
    default:
      return undefined;
  }
}


// export function writeBrep(shell: Shell): BrepOutputData {
//
//   const brepData: BrepOutputData = {
//     faces: []
//   };
//
//   for (let f of shell.faces) {
//     const faceData: FaceData = {
//       surface: writeSurface(f.surface),
//       inverted: f.surface.inverted,
//       loops: []
//     };
//
//     brepData.faces.push(faceData);
//
//     for (let l of f.loops) {
//       const loop = [];
//       faceData.loops.push(loop);
//
//
//
//       for (let he of l.halfEdges) {
//         const vs = [he.vertexA, he.vertexB];
//         if (he.inverted) {
//           vs.reverse();
//         }
//         const [a, b] = vs;
//         const curve = he.edge.curve;
//         const edgeData: EdgeData = {
//           a: a.point.toArray(),
//           b: b.point.toArray(),
//
//           inverted: he.inverted,
//           curveBounds: curve.domain,
//
//           curve: writeCurve(curve)
//
//         };
//         loop.push(edgeData);
//       }
//
//     }
//   }
//   return brepData;
// }
//
//
// function writeSurface(surface: BrepSurface) {
//   const impl = surface.impl;
//   if (impl instanceof NurbsSurface) {
//     const {
//       degreeU,
//       degreeV,
//       controlPoints,
//       knotsU,
//       knotsV,
//       weights
//     } = impl.data;
//     return {
//
//       TYPE: "B-SPLINE",
//
//       direct: surface.mirrored,
//
//       degU: degreeU,
//       degV: degreeV,
//       knotsU: number[],
//       knotsV: number[],
//       weights: number[][],
//       cp: controlPoints
//     }
//   } else {
//     throw 'only nurbs';
//   }
// }

export function normalizetessellationData(tessellation, inverted, surfaceNormal) {
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
