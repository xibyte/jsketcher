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
import {BrepOutputData} from "engine/data/brepOutputData";
import {ProductionInfo} from "engine/productionInfo";
import {Tessellation1D} from "engine/tessellation";
import {Shell} from "brep/topo/shell";
import {BrepInputData} from "engine/data/brepInputData";
import {Vertex} from "brep/topo/vertex";
import {Edge} from "brep/topo/edge";
import {ParametricSurface} from "geom/surfaces/parametricSurface";

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
        ref: number,
        ptr: number
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
    // @ts-ignore
    let nonDirect = faceData.surface.direct === false; // left handed coordinate system for planes
    let inverted = faceData.inverted !== nonDirect;
    bb._face.data.tessellation = {
      format: 'verbose',
      data: normalizetessellationData(faceData.tess, inverted, faceData.surface.TYPE === 'PLANE' ? faceData.surface.normal : undefined)
    };
    bb._face.data.productionInfo = faceData.productionInfo;
    if (faceData.ref !== undefined) {
      bb._face.data.externals = {
        ref: faceData.ref,
        ptr: faceData.ptr
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


export function writeBrep(shell: Shell): BrepInputData {

  const brepData: BrepInputData = {
    vertices: {},
    curves: {},
    surfaces: {},
    edges: {},
    faces: []
  };

  const surfaces = new Map<ParametricSurface, string>();
  const curves = new Map<BrepCurve, string>();
  const verts = new Map<Vertex, string>();
  const edges = new Map<Edge, string>();

  let vid = 0;
  for (let v of shell.vertices) {
    const id = 'v' + (vid++);
    brepData.vertices[id] = v.point.data();
    verts.set(v, id);
  }

  let cid = 0;
  for (let e of shell.edges) {
    let curveId = curves.get(e.curve);
    // since we it can't be non smooth splines without a vertex - simple just skip it
    if (!curveId && e.curve.degree != 1) {
      curveId = 'c' + (cid++);
      brepData.curves[curveId] = e.curve.impl.asCurveBSplineData();
      curves.set(e.curve, curveId);
    }

    const a = verts.get(e.halfEdge1.vertexA);
    const b = verts.get(e.halfEdge1.vertexB);
    const edgeId = a + '_' + b;

    brepData.edges[edgeId] = {
      a, b,
      curve: curveId
    }

    edges.set(e, edgeId);

  }

  let sid = 0;
  for (let face of shell.faces) {

    let surfaceId = surfaces.get(face.surface.impl);
    if (!surfaceId) {
      surfaceId = 's' + (sid++);
      const plane = face.surface.simpleSurface as Plane;
      if (plane !== null) {
        brepData.surfaces[surfaceId] = {
          TYPE: 'PLANE',
          normal: plane.normal.data(),
          origin: plane.normal.multiply(plane.w).data()
        }
      } else {
        brepData.surfaces[surfaceId] = {
          ... (face.surface.impl as NurbsSurface).asSurfaceBSplineData()
        }
      }


      //direct needed only for planes
      //direct: face.surface.mirrored ? false : undefined

      surfaces.set(face.surface.impl, surfaceId);
    }
  }


  FACES:
  for (let face of shell.faces) {
    const loops = [];
    for (let loop of face.loops) {
      if (loop.halfEdges.length == 0) {
        continue FACES;    
      }
      loops.push(loop.halfEdges.map(he => edges.get(he.edge)));
    }

    brepData.faces.push({
      surface: surfaces.get(face.surface.impl),
      inverted: face.surface.inverted,
      loops
    })
  }
  return brepData;
}



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
