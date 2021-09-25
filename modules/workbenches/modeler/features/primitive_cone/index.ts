import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon32 from './icon32.png';
import icon96 from './icon96.png';

export default {
    id: 'primitive_cone',
    label: 'primitive_cone',
    icon: {
      iconSet: {
        medium: {
          iconType: 'image',
          iconContent: icon32      
        },
        large: {
          iconType: 'image',
          iconContent: icon96      
        }
      },           
    },
    info: 'primitive_cone',
    mutualExclusiveFields: [],
    paramsInfo: ({ diameter_A, diameter_B, height }) => `(${r(diameter_A)} ${r(diameter_A)}  ${r(height)})`,
    schema: {
        diameter_A: {
            type: 'number',
            defaultValue: 50,
            label: 'Diameter A'
        },
        diameter_B: {
            type: 'number',
            defaultValue: 100,
            label: 'Diameter B'
        },
        height: {
            type: 'number',
            defaultValue: 200,
            label: 'height'
        },
    },
    run: ({ diameter_A, diameter_B, height, }, ctx: ApplicationContext) => {
        const oc = ctx.occService.occContext;

        const myLocation = new oc.gp_Pnt_3(0, 0, 0);
        const coneCenterline = oc.gp.DZ();
        const coneOrientationAndLocation = new oc.gp_Ax2_3(myLocation, coneCenterline);

        let myBody = new oc.BRepPrimAPI_MakeCone_1(diameter_A, diameter_B, height);

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

