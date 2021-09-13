import BrepBuilder from "brep/brep-builder";
import { normalizetessellationData } from "brep/io/brepIO";
import VertexFactory from "brep/vertexFactory";
import { BrepSurface } from "geom/surfaces/brepSurface";
import NullSurface from "geom/surfaces/nullSurface";


export function occ2brep(aShape: any, oc: any) {

  let bb = new BrepBuilder();
  let vf = new VertexFactory();

  new oc.BRepMesh_IncrementalMesh_2(aShape, 3, false, 0.5, false);

  console.log(oc.TopAbs_ShapeEnum.TopAbs_FACE)
  const aExpFace = new oc.TopExp_Explorer_2(aShape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const out = {};
  const facesOut = [];
  for (; aExpFace.More(); aExpFace.Next()) {

    const aFace = oc.TopoDS.Face_1(aExpFace.Current());

    bb.face();
    // @ts-ignore
    let nonDirect = false; // left handed coordinate system for planes
    let inverted = aFace.Orientation_1() == oc.TopAbs_Orientation.TopAbs_REVERSED !== nonDirect;

    const aSurface = oc.BRep_Tool.Surface_2(aFace).get();
    aSurface.IsKind = () => false
    //   let surfaceOut = {};
    if (aSurface.IsKind("Geom_BoundedSurface")) {
      const bSpline = oc.GeomConvert.prototype.SurfaceToBSplineSurface(aSurface).get();
      // surfaceOut = {"TYPE": "UNKNOWN"};//surfaceWriteBounded(bSpline);
      //if BRepPrimAPI_MakePrism(,,,canonicalize = true ) then all swept surfaces(walls) are forced to planes if possible
    } else if (aSurface.IsKind("Geom_ElementarySurface")) {
      //        printf("INTER TYPE: Geom_ElementarySurface \n");
      if (aSurface.IsKind("Geom_Plane")) {
        //   surfaceOut = surfaceWritePlane(aSurface);
      } else {
        //   surfaceOut = {"TYPE": "UNKNOWN"};
      }
    } else if (aSurface.IsKind("Geom_SweptSurface")) {
      //        printf("INTER TYPE: Geom_SweptSurface \n");
      // surfaceOut = {"TYPE": "SWEPT"};
    } else if (aSurface.IsKind("Geom_OffsetSurface")) {
      //        printf("INTER TYPE: Geom_OffsetSurface \n");
      // surfaceOut = {"TYPE": "OFFSET"};
    } else {
      bb._face.surface = new BrepSurface(new NullSurface());
    }


    console.log("string tesselation");
    let aLocation = new oc.TopLoc_Location_1();
    let aTrHandler = oc.BRep_Tool.Triangulation(aFace, aLocation);
    console.log("got triangles");

    const tessOut = [];
    if (!aTrHandler.IsNull()) {
      const aTr = aTrHandler.get();
      const aNodes = aTr.Nodes();

      const points = [];
      for (let i = 0; i < aNodes.Length(); i++) {
        let p = aNodes.Value(i + 1).Transformed(aLocation.Transformation());
        points.push([p.X(), p.Y(), p.Z()]);
      }

      const triangles = aTr.Triangles();
      const nnn = aTr.NbTriangles();

      const isPlane = aSurface.IsKind("Geom_Plane");

      for (let nt = 1; nt < nnn + 1; nt++) {
        // takes the node indices of each triangle in n1,n2,n3: 

        let t = triangles.Value(nt);

        let n1 = t.Value(1);
        let n2 = t.Value(2);
        let n3 = t.Value(3);

        const aPnt1 = points[n1 - 1];
        const aPnt2 = points[n2 - 1];
        const aPnt3 = points[n3 - 1];

        const def = [];

        const tr = [];
        tr.push(aPnt1);
        tr.push(aPnt2);
        tr.push(aPnt3);

        def.push(tr);

        if (!isPlane) {
          // const norms = [];
          // norms.push(dirWrite(computeNormal(aTr->UVNode(n1), aSurface).Transformed(aLocation)));  
          // norms.push(dirWrite(computeNormal(aTr->UVNode(n2), aSurface).Transformed(aLocation)));  
          // norms.push(dirWrite(computeNormal(aTr->UVNode(n3), aSurface).Transformed(aLocation)));
          // def.push(norms);  
        }

        tessOut.push(def);
      }

      bb._face.data.tessellation = {
        format: 'verbose',
        data: normalizetessellationData(tessOut, inverted, null)
      };
      bb._face.data.externals = {
        // ref: ((std::uintptr_t)aFace.TShape().get())            
      }

      //   bb._face.data.productionInfo = faceData.productionInfo;
    }


    //BRepTools::OuterWire(face)  - return outer wire for classification if needed 
    const wires = new oc.TopExp_Explorer_2(aFace, oc.TopAbs_ShapeEnum.TopAbs_WIRE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
   
    while (wires.More()) {
        bb.loop();

        console.log("processing wires");
        const wire = oc.TopoDS.Wire_1(wires.Current()); 

        wires.Next();
        const aExpEdge = new oc.BRepTools_WireExplorer_2(wire);
      //   const edgesOut = [];
        while (aExpEdge.More()) {
          const aEdge = oc.TopoDS.Edge_1(aExpEdge.Current()); 
          aExpEdge.Next(); 

          if(aEdge.IsNull()) {
            console.log("edge is null, skipping");
            continue;
          }

      //     const edgeOut = {};//edgeWrite(aEdge);
      // if (!edgeOut.hasKey("a") || !edgeOut.hasKey("b")) {
      //   std::cout << "can't write edge, skipping" << std::endl;
      //   continue;
      // }
      //   const edgeTessOut = Array();

            // let a = vf.getData(edgeData.inverted ? edgeData.b : edgeData.a);
            // let b = vf.getData(edgeData.inverted ? edgeData.a : edgeData.b);
            // bb.edge(a, b, () => undefined, edgeData.inverted,  edgeData.edgeRef);
            // bb.lastHalfEdge.edge.data.tessellation = edgeData.tess;
            // //todo: data should provide full externals object
            // bb.lastHalfEdge.edge.data.externals = {
            //   ptr: edgeData.ptr
            // };


        const edgePolHandler = oc.BRep_Tool.PolygonOnTriangulation_1(aEdge, aTrHandler, aLocation);  
        if(!edgePolHandler.IsNull())  {
          // const edgePol = edgePolHandler.get();

      //     const TColStd_Array1OfInteger& edgeIndices = edgePol->Nodes(); 
      //     for( Standard_Integer j = 1; j <= edgeIndices.Length(); j++ ) {
      //       gp_Pnt edgePoint = fPoints(edgeIndices(j));
      //       edgeTessOut.append(pntWrite(edgePoint));        
      //     }
            // const eNodes = edgePol.Nodes();
            // const points = [];
            // for (let i = 0; i < eNodes.Length(); i++) {
            //   let p = eNodes.Value(i + 1).Transformed(aLocation.Transformation());
            //   points.push([p.X(), p.Y(), p.Z()]);
            // }


        } else {
      //     Handle(Poly_PolygonOnTriangulation) pt;
      //     Handle(Poly_Triangulation) edgeTr;
      //     TopLoc_Location edgeLoc;
      //     BRep_Tool::PolygonOnTriangulation(aEdge, pt, edgeTr, edgeLoc);
      //     if(!pt.IsNull())  {
      //       const TColStd_Array1OfInteger& edgeIndices = pt->Nodes(); 
      //       const TColgp_Array1OfPnt& edgeNodes = edgeTr->Nodes(); 
      //       for( Standard_Integer j = 1; j <= edgeIndices.Length(); j++ ) {
      //         gp_Pnt edgePoint = edgeNodes(j).Transformed(edgeLoc);
      //         edgeTessOut.append(pntWrite(edgePoint));        
      //       }
      //     }
      //   }
      //   if (!INTERROGATE_STRUCT_ONLY) {
      //     edgeOut["tess"] = edgeTessOut;
        }
      //   TopoDS_Edge* persistEdge = new TopoDS_Edge(aEdge);

      //   edgeOut["ptr"] = ((std::uintptr_t)persistEdge);
      //   edgeOut["edgeRef"] = edgeFaceMap.FindIndex(aEdge);
      //   edgesOut.append(edgeOut);  
      }
      // loopsOut.append(edgesOut);
    }

    // if (model != NULL) {
    //   if (model->hasData(aFace)) {
    //     faceOut["productionInfo"] = model->getData(aFace);
    //   }
    // }
    // faceOut["ref"] = ((std::uintptr_t)aFace.TShape().get());
  }
  return bb.build();;
}

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
