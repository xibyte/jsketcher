import BrepBuilder from "brep/brep-builder";
import { normalizetessellationData } from "brep/io/brepIO";
import VertexFactory from "brep/vertexFactory";
import { BrepSurface } from "geom/surfaces/brepSurface";
import NullSurface from "geom/surfaces/nullSurface";

export type OCCShape = any;

export function occ2brep(aShape: any, oc: any) {

  let bb = new BrepBuilder();
  let vf = new VertexFactory();

  new oc.BRepMesh_IncrementalMesh_2(aShape, 3, false, 0.5, false);
  bb._shell.data.occShape = aShape;
  const aExpFace = new oc.TopExp_Explorer_2(aShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; aExpFace.More(); aExpFace.Next()) {

    const aFace = oc.TopoDS.Face_1(aExpFace.Current());

    bb.face();
    // @ts-ignore
    let nonDirect = false; // left handed coordinate system for planes
    let inverted = aFace.Orientation_1() == oc.TopAbs_Orientation.TopAbs_REVERSED !== nonDirect;

    const aSurface = oc.BRep_Tool.Surface_2(aFace).get();

    bb._face.surface = new BrepSurface(new NullSurface());

    const aLocation = new oc.TopLoc_Location_1();
    const locationTransformation = aLocation.Transformation();
    const aTrHandler = oc.BRep_Tool.Triangulation(aFace, aLocation);

    const tessOut = [];
    const tessPoints = [];
    if (!aTrHandler.IsNull()) {
      const aTr = aTrHandler.get();
      const aNodes = aTr.Nodes();

      for (let i = 0; i < aNodes.Length(); i++) {
        let p = aNodes.Value(i + 1).Transformed(locationTransformation);
        tessPoints.push([p.X(), p.Y(), p.Z()]);
      }

      const triangles = aTr.Triangles();
      const nnn = aTr.NbTriangles();

      for (let nt = 1; nt < nnn + 1; nt++) {
        // takes the node indices of each triangle in n1,n2,n3: 

        let t = triangles.Value(nt);

        let n1 = t.Value(1);
        let n2 = t.Value(2);
        let n3 = t.Value(3);

        const aPnt1 = tessPoints[n1 - 1];
        const aPnt2 = tessPoints[n2 - 1];
        const aPnt3 = tessPoints[n3 - 1];

        const def = [];

        const tr = [];
        tr.push(aPnt1);
        tr.push(aPnt2);
        tr.push(aPnt3);

        def.push(tr);

        const norms = [];
        norms.push(pntWrite(computeNormal(aTr.UVNode(n1), aSurface, oc).Transformed(locationTransformation)));
        norms.push(pntWrite(computeNormal(aTr.UVNode(n2), aSurface, oc).Transformed(locationTransformation)));
        norms.push(pntWrite(computeNormal(aTr.UVNode(n3), aSurface, oc).Transformed(locationTransformation)));
        def.push(norms);

        tessOut.push(def);
      }

      bb._face.data.tessellation = {
        format: 'verbose',
        data: normalizetessellationData(tessOut, inverted, null)
      };
      // bb._face.data.externals = {
        // ref: ((std::uintptr_t)aFace.TShape().get())            
      // }

      bb._face.data.occShape = aExpFace;

      //   bb._face.data.productionInfo = faceData.productionInfo;
    }

    // const edgeFaceMap = new oc.TopTools_IndexedDataMapOfShapeListOfShape();
    // oc.TopExp_MapShapesAndAncestors(aShape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_FACE, edgeFaceMap);
    //
    // console.log(edgeFaceMap);

    //BRepTools::OuterWire(face)  - return outer wire for classification if needed 
    const wires = new oc.TopExp_Explorer_2(aFace, oc.TopAbs_ShapeEnum.TopAbs_WIRE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);

    while (wires.More()) {
      bb.loop();
      const wire = oc.TopoDS.Wire_1(wires.Current());

      bb._loop.data.occShape = wire;

      wires.Next();
      const aExpEdge = new oc.BRepTools_WireExplorer_2(wire);
      while (aExpEdge.More()) {
        const aEdge = oc.TopoDS.Edge_1(aExpEdge.Current());
        aExpEdge.Next();

        if (aEdge.IsNull()) {
          continue;
        }

        const edgeKey = occShapeKey(aEdge);

        const ex = new oc.TopExp_Explorer_2(aEdge, oc.TopAbs_ShapeEnum.TopAbs_VERTEX, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
        let vertexA = null;
        let vertexB = null;
        for (; ex.More(); ex.Next()) {
          const vertex = oc.TopoDS.Vertex_1(ex.Current());
          if (vertexA === null) {
            vertexA = vertex;
          } else {
            vertexB = vertex;
          }
        }

        const getVertex = occVertex => {
          const pnt = oc.BRep_Tool.Pnt(occVertex);
          const vertex = vf.getData(pntWrite(pnt));
          vertex.data.occShape = occVertex;
          return vertex;
        };

        bb.edge(getVertex(vertexA), getVertex(vertexB), () => undefined, false, edgeKey);

        const edgeTessOut = [];

        const edgePolHandler = oc.BRep_Tool.PolygonOnTriangulation_1(aEdge, aTrHandler, aLocation);
        if (!edgePolHandler.IsNull()) {
          const edgePol = edgePolHandler.get();
          const edgeIndices = edgePol.Nodes();
          for (let i = 0; i < edgeIndices.Length(); i++) {
            edgeTessOut.push(tessPoints[edgeIndices.Value(i + 1) - 1]);
          }
        }

        bb.lastHalfEdge.data.occShape = aEdge;
        bb.lastHalfEdge.edge.data.tessellation = edgeTessOut;
      }

      // if (model != NULL) {
      //   if (model->hasData(aFace)) {
      //     faceOut["productionInfo"] = model->getData(aFace);
      //   }
      // }
      // faceOut["ref"] = ((std::uintptr_t)aFace.TShape().get());
    }
  }
  return bb.build();
}


// function edgeWrite(edge, oc) {
//
//   // returns the 3d curve of the edge and the parameter range
//   const ex = new oc.TopExp_Explorer_2(edge, oc.TopAbs_ShapeEnum.TopAbs_VERTEX, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
//   let a = null;
//   let b = null;
//   for (; ex.More(); ex.Next()) {
//     const vertex = oc.TopoDS.Vertex_1(ex.Current());
//     console.log("processing vertex " + vertex);
//     const pnt = oc.BRep_Tool.Pnt(vertex);
//     const out = pntWrite(pnt);
//     console.log("got point", out);
//     if (a === null) {
//       a = out;
//     } else {
//       b = out;
//     }
//   }
//
//   return {a, b};
// }

//   function readBrep(data: BrepOutputData) {

//     let bb = new BrepBuilder();
//     let vf = new VertexFactory();

//     for (let faceData of data.faces) {
//       bb.face();
//       // @ts-ignore
//       let nonDirect = faceData.surface.direct === false; // left handed coordinate system for planes
//       let inverted = faceData.inverted !== nonDirect;
//       bb._face.data.tessellation = {
//         format: 'verbose',
//         data: normalizetessellationData(faceData.tess, inverted, faceData.surface.TYPE === 'PLANE' ? faceData.surface.normal : undefined)
//       };
//       bb._face.data.productionInfo = faceData.productionInfo;
//       if (faceData.ref !== undefined) {
//         bb._face.data.externals = {
//           ref: faceData.ref,
//           ptr: faceData.ptr
//         }  
//       }  

//       for (let loop of faceData.loops) {
//         bb.loop();
//         for (let edgeData of loop) {
//           let a = vf.getData(edgeData.inverted ? edgeData.b : edgeData.a);
//           let b = vf.getData(edgeData.inverted ? edgeData.a : edgeData.b);
//           bb.edge(a, b, () => undefined, edgeData.inverted,  edgeData.edgeRef);
//           bb.lastHalfEdge.edge.data.tessellation = edgeData.tess;
//           //todo: data should provide full externals object
//           bb.lastHalfEdge.edge.data.externals = {
//             ptr: edgeData.ptr
//           };
//         }
//       }
//       // try {
//       //   bb._face.surface = readSurface(faceData.surface, faceData.inverted, inverted, bb._face);
//       // } catch (e) {
//       //   console.error(e);
//       //   bb._face.surface = new BrepSurface(new NullSurface());
//       // }
//       bb._face.surface = new BrepSurface(new NullSurface());
//     }
//     //todo: data should provide full externals object
//     bb._shell.data.externals = {
//       ptr: data.ptr
//     };
//     return bb.build();
//   }

function computeNormal(aUVNode, aSurface, oc) {
  const aDummyPnt = new oc.gp_Pnt_1();
  const aV1 = new oc.gp_Vec_1();
  const aV2 = new oc.gp_Vec_1();
  aSurface.D1(aUVNode.X(), aUVNode.Y(), aDummyPnt, aV1, aV2);
  const aNormal = aV1.Crossed(aV2);
  aNormal.Multiply (1 / aNormal.Magnitude());
  return aNormal;
}

export function occShapeKey(occShape: OCCShape) {
  return occShape.TShape_1().get().$$.ptr;
}

const pntWrite = p => [p.X(), p.Y(), p.Z()];