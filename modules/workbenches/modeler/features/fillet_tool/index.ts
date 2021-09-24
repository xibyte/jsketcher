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
    paramsInfo: ({ sizeA, }) => `(${r(sizeA)} })`,
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

        sizeA: {
            type: 'number',
            defaultValue: 10,
            label: 'radius'
        },
    },

    run: ({ edgeOperationType, edgeSelection, sizeA, }, ctx: ApplicationContext) => {
        const oc = ctx.occService.occContext;

        let myBody = new oc.BRepPrimAPI_MakeBox_1(200, 200, 200);

        //collection of edges to modify
        let edgesToModify = [];


        const anEdgeExplorer = new oc.TopExp_Explorer_2(myBody.Shape(), oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
        var anEdge = oc.TopoDS.Edge_1(anEdgeExplorer.Current());
        edgesToModify.push(anEdge);

        anEdgeExplorer.Next()
        anEdge = oc.TopoDS.Edge_1(anEdgeExplorer.Current());
        edgesToModify.push(anEdge);


        if (edgeOperationType.toUpperCase() == "FILLET") {
            const mkFillet = new oc.BRepFilletAPI_MakeFillet(myBody.Shape(), oc.ChFi3d_FilletShape.ChFi3d_Rational);

            // Add edge to fillet 
            edgesToModify.forEach(async function (edgeToAdd) {
                mkFillet.Add_2(sizeA, edgeToAdd);
            });
            myBody = mkFillet;

        } else if (edgeOperationType.toUpperCase() == "CHAMPHER") {
            const mkChampher = new oc.BRepFilletAPI_MakeChamfer(myBody.Shape());

            // Add edge to champher 
            edgesToModify.forEach(async function (edgeToAdd) {
                mkChampher.Add_2(sizeA, edgeToAdd);
            });
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

