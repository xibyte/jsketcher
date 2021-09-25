import { ApplicationContext } from 'context';
import { MBrepShell } from '../../../../../web/app/cad/model/mshell';
import { roundValueForPresentation as r } from '../../../../../web/app/cad/craft/operationHelper';
import { occ2brep } from '../../../../../web/app/cad/occ/occ2models';

export default {
    id: 'primitive_torus',
    label: 'primitive_torus',
    icon: 'img/cad/extrude',
    info: 'primitive_torus',
    mutualExclusiveFields: [],
    paramsInfo: ({ radius, tubeRadius }) => `(${r(radius)} ${r(tubeRadius)} )`,
    run: ({ radius, tubeRadius  }, ctx: ApplicationContext) => {

        const oc = ctx.occService.occContext;

        const myLocation = new oc.gp_Pnt_3(0, 0, 0);
        const torusCenterline = oc.gp.DZ();
        const torusOrientationAndLocation = new oc.gp_Ax2_3(myLocation, torusCenterline);


        let myBody = new oc.BRepPrimAPI_MakeTorus_1(radius, tubeRadius);
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
        radius : {
            type: 'number',
            defaultValue: 200,
            label: 'radius'
        },
        tubeRadius: {
            type: 'number',
            defaultValue: 50,
            label: 'tube radius'
        },
    }
}

