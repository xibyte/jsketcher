import {
  OCC_Geom_Curve,
  OCC_Geom_TrimmedCurve,
  OCC_Handle, OCC_ListOfShapes,
  OCC_TopoDS_Edge,
  OCC_TopoDS_Face,
  OCC_TopoDS_Shape
} from "occ/occ";
import {OCCContext} from "cad/craft/occPlugin";

export function upcastCurve<T extends OCC_Geom_Curve>(oc: OCCContext, curve: OCC_Handle<T>): OCC_Handle<OCC_Geom_Curve> {
  return new oc.Handle_Geom_Curve_2(curve.get());
}

export function occIterateEdges(oc: OCCContext, root: OCC_TopoDS_Shape, callback: (edge: OCC_TopoDS_Edge) => any) {
  const explorer = new oc.TopExp_Explorer_2(root, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  while(explorer.More()) {
    callback(oc.TopoDS.Edge_1(explorer.Current()));
    explorer.Next();
  }
}

export function occIterateFaces(oc: OCCContext, root: OCC_TopoDS_Shape, callback: (edge: OCC_TopoDS_Face) => any) {
  const explorer = new oc.TopExp_Explorer_2(root, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  while(explorer.More()) {
    callback(oc.TopoDS.Face_1(explorer.Current()));
    explorer.Next();
  }
}

export function occIterateListOfShape(oc: OCCContext, listOfShapes: OCC_ListOfShapes, callback: (edge: OCC_TopoDS_Shape) => any) {
  const it = oc.TopTools_ListIteratorOfListOfShape(listOfShapes);
  while (it.More()) {
    callback(it.Value());
    it.Next();
  }
}
