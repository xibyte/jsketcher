import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon from './icon.svg';

export default {
    id: 'hole_tool',
    label: 'hole_tool',
    icon,
    info: 'hole_tool',
    mutualExclusiveFields: [],
    paramsInfo: ({ diameter,
        depth,
        counterBoreDiameter,
        counterBoreDepth,
        countersinkDiameter,
        countersinkAngle,
        holeType, }) => `(${r(depth)} ${r(counterBoreDiameter)})  ${r(counterBoreDepth)})`,
    run: ({
        diameter,
        depth,
        counterBoreDiameter,
        counterBoreDepth,
        countersinkDiameter,
        countersinkAngle,
        holeType,
    }, ctx: ApplicationContext) => {
        const oc = ctx.occService.occContext;

        const myLocation = new oc.gp_Pnt_3(0, 0, 0);
        const cylinderCenterline = oc.gp.DZ();
        const cylinderOrientationAndLocation = new oc.gp_Ax2_3(myLocation, cylinderCenterline);


        let myBody = new oc.BRepPrimAPI_MakeCylinder_3(cylinderOrientationAndLocation, diameter / 2, depth,);


        if (holeType == "counterbore") {
            let counterboreItem = new oc.BRepPrimAPI_MakeCylinder_3(cylinderOrientationAndLocation, counterBoreDiameter, counterBoreDepth,);
            myBody = new oc.BRepAlgoAPI_Fuse_3(myBody.Shape(), counterboreItem.Shape());
        }



        if (holeType == "countersink") {
            let heightFromDiameterAndAngle = (countersinkDiameter - diameter) / (2 * Math.tan((countersinkAngle / 180 * Math.PI) / 2));
            let countersinkItem = new oc.BRepPrimAPI_MakeCone_1(countersinkDiameter / 2, diameter / 2, heightFromDiameterAndAngle);
            myBody = new oc.BRepAlgoAPI_Fuse_3(myBody.Shape(), countersinkItem.Shape());
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
    schema: {
        diameter: {
            type: 'number',
            defaultValue: 10,
            label: 'Hole ⌀'
        },
        depth: {
            type: 'number',
            defaultValue: 100,
            label: 'Hole ↧'
        },


        holeType: {
            type: 'TextField',
            defaultValue: "counterbore",
            label: 'HoleType',
            children: [
                "counterbore",
                "countersink",
                "normal",
            ],
        },


        counterBoreDiameter: {
            type: 'number',
            defaultValue: 20,
            label: '⌴ ⌀'
        },
        counterBoreDepth: {
            type: 'number',
            defaultValue: 10,
            label: '⌴ ↧'
        },



        countersinkDiameter: {
            type: 'number',
            defaultValue: 20,
            label: '⌵ ⌀'
        },
        countersinkAngle: {
            type: 'number',
            defaultValue: 90,
            label: '⌵ Angle'
        },
    }
}
















