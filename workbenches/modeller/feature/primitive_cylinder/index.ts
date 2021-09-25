import { ApplicationContext } from 'context';
import { MBrepShell } from '../../../../../web/app/cad/model/mshell';
import { roundValueForPresentation as r } from '../../../../../web/app/cad/craft/operationHelper';
import { occ2brep } from '../../../../../web/app/cad/occ/occ2models';

export default {
    id: 'primitive_cylinder',
    label: 'primitive_cylinder',
    icon: 'img/cad/extrude',
    info: 'primitive_cylinder',
    mutualExclusiveFields: [],
    paramsInfo: ({ diameter, height }) => `(${r(diameter)} ${r(height)})`,
    run: ({ diameter, height, }, ctx: ApplicationContext) => {
        //const occObj = createCylinder(diameter, height, ctx.occService.occContext);
        const oc = ctx.occService.occContext;

        const myLocation = new oc.gp_Pnt_3(0, 0, 0);
        const cylinderCenterline = oc.gp.DZ();
        const cylinderOrientationAndLocation = new oc.gp_Ax2_3(myLocation, cylinderCenterline);


        let myBody = new oc.BRepPrimAPI_MakeCylinder_3(cylinderOrientationAndLocation, diameter, height,);
        //let myBody = new oc.BRepPrimAPI_Make

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
            defaultValue: 200,
            label: 'diameter'
        },
        height: {
            type: 'number',
            defaultValue: 280,
            label: 'height'
        },
    }
}

