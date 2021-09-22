import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon from './icon.svg';

export default {
    id: 'primitive_cone',
    label: 'primitive_cone',
    icon,
    info: 'primitive_cone',
    mutualExclusiveFields: [],
    paramsInfo: ({ diameter, height }) => `(${r(diameter)} ${r(height)})`,
    run: ({ diameter, height, }, ctx: ApplicationContext) => {
        //const occObj = createcone(diameter, height, ctx.occService.occContext);
        const oc = ctx.occService.occContext;

        const myLocation = new oc.gp_Pnt_3(0, 0, 0);
        const coneCenterline = oc.gp.DZ();
        const coneOrientationAndLocation = new oc.gp_Ax2_3(myLocation, coneCenterline);

        let myBody = new oc.BRepPrimAPI_MakeCone_1(10,20,100);
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

