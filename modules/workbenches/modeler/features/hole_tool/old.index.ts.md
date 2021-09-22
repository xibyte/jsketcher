import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon from './icon.svg';

export default {
    id: 'hole',
    label: 'hole',
    icon,
    info: 'hole',
    mutualExclusiveFields: [],
    paramsInfo: ({ diameter, depth, counterBoreDiameter, counterBoreDepth, countersinkDiameter, countersinkAngle,}) => `(${r(diameter)} ${r(depth)})`,
    run: ({ diameter, depth, counterBoreDiameter, counterBoreDepth, countersinkDiameter, countersinkAngle, }, ctx: ApplicationContext) => {
        //const occObj = createCylinder(diameter, height, ctx.occService.occContext);
        const oc = ctx.occService.occContext;

        const myLocation = new oc.gp_Pnt_3(0, 0, 0);
        const cylinderCenterline = oc.gp.DZ();
        const cylinderOrientationAndLocation = new oc.gp_Ax2_3(myLocation, cylinderCenterline);


        let primaryHole = new oc.BRepPrimAPI_MakeCylinder_3(cylinderOrientationAndLocation, diameter, depth,);



        //let myBody = new oc.BRepPrimAPI_Make

        const aRes = new oc.TopoDS_Compound();
        const aBuilder = new oc.BRep_Builder();
        aBuilder.MakeCompound(aRes);
        aBuilder.Add(aRes, primaryHole.Shape());



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
            label: 'diameter'
        },
        depth: {
            type: 'number',
            defaultValue: 100,
            label: 'depth'
        },
        


        counterBoreDiameter: {
            type: 'number',
            defaultValue: 200,
            label: 'diameter'
        },
        counterBoreDepth: {
            type: 'number',
            defaultValue: 280,
            label: 'counterBoreDepth'
        },



        countersinkDiameter: {
            type: 'number',
            defaultValue: 200,
            label: 'countersinkDiameter'
        },
        countersinkAngle: {
            type: 'number',
            defaultValue: 90,
            label: 'Countersink Angle'
        },

    }
}

