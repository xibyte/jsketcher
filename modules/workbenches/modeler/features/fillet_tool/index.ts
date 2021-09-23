import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon from './icon.svg';

export default {
    id: 'fillet_tool',
    label: 'fillet_tool',
    icon,
    info: 'fillet_tool',
    mutualExclusiveFields: [],
    paramsInfo: ({ radius, }) => `(${r(radius)} })`,
    schema: {
        edgeOperationType: {
            type: 'TextField',
            defaultValue: "FILLET",
            label: 'Operation Type',
            children: [
                "Fillet",
                "Champher",
                "2 Sided Champher",
            ],
        },

        edgeSelection: {
            type: 'number',
            defaultValue: 280,
            label: 'Edge Selection'
        },

        radius: {
            type: 'number',
            defaultValue: 10,
            label: 'radius'
        },
    },

    run: ({ edgeOperationType, edgeSelection, radius, }, ctx: ApplicationContext) => {
        const oc = ctx.occService.occContext;

        let myBody = new oc.BRepPrimAPI_MakeBox_1(200, 200, 200);

        if (edgeOperationType.toUpperCase() == "FILLET") {

            const mkFillet = new oc.BRepFilletAPI_MakeFillet(myBody.Shape(), oc.ChFi3d_FilletShape.ChFi3d_Rational);
            const anEdgeExplorer = new oc.TopExp_Explorer_2(myBody.Shape(), oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);

            const anEdge = oc.TopoDS.Edge_1(anEdgeExplorer.Current());

            // Add edge to fillet 
            mkFillet.Add_2(radius, anEdge);
            myBody = mkFillet;

        } else if (edgeOperationType.toUpperCase() == "CHAMPHER") {
            // BRepFilletAPI_MakeChamfer()
            const mkChampher = new oc.BRepFilletAPI_MakeChamfer(myBody.Shape());
            const anEdgeExplorer = new oc.TopExp_Explorer_2(myBody.Shape(), oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);

            const anEdge = oc.TopoDS.Edge_1(anEdgeExplorer.Current());

            // Add edge to fillet 
            mkChampher.Add_2(radius, anEdge);
            myBody = mkChampher;
        }



        const aRes = new oc.TopoDS_Compound();
        const aBuilder = new oc.BRep_Builder();
        aBuilder.MakeCompound(aRes);
        aBuilder.Add(aRes, myBody.Shape());



        const mobject = new MBrepShell(occ2brep(aRes, ctx.occService.occContext));
        return {
            consumed: [],
            created: [mobject]
        };
    },

}

