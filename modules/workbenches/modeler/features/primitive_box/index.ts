import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon32 from './icon32.png';
import icon96 from './icon96.png';

export default {
    id: 'primitive_box',
    label: 'primitive_box',
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
    info: 'primitive_box',
    mutualExclusiveFields: [],
    paramsInfo: ({ boxX, boxY, boxZ }) => `(${r(boxX)} ${r(boxY)})  ${r(boxZ)})`,
    schema: {
        boxX: {
            type: 'number',
            defaultValue: 200,
            label: 'X'
        },
        boxY: {
            type: 'number',
            defaultValue: 280,
            label: 'Y'
        },
        boxZ: {
            type: 'number',
            defaultValue: 280,
            label: 'Z'
        },
    },


    run: ({ boxX, boxY, boxZ }, ctx: ApplicationContext) => {
        //const occObj = createCylinder(diameter, height, ctx.occService.occContext);
        const oc = ctx.occService.occContext;


        let myBody = new oc.BRepPrimAPI_MakeBox_1(boxX, boxY, boxZ);
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

}

