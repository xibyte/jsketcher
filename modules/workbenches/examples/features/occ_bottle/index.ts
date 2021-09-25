import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { createOCCBottle } from './bottle.occ';
import { occ2brep } from 'cad/occ/occ2models';
import icon from './icon.svg'; 

export default {
    id: 'OCC_BOTTLE',
    label: 'OCC Bottle',
    icon: {
        iconType: 'svg',
        iconContent: icon
    },
    info: 'create occ bottle',
    mutualExclusiveFields: [],
    paramsInfo: ({ width, height, thickness }) => `(${r(width)} ${r(height)} ${r(thickness)})`,
    schema: {
        width: {
            type: 'number',
            defaultValue: 200,
            label: 'width'
        },
        height: {
            type: 'number',
            defaultValue: 280,
            label: 'height'
        },
        thickness: {
            type: 'number',
            min: 0,
            label: 'thickness',
            defaultValue: 150
        }
    },
    color: {
        type: 'enum',
        options: [
            {
                label: 'Red',
                value: 'red'
            },
            {
                label: 'Green',
                value: 'green'
            }
        ]            
    },        
    run: ({ width, height, thickness }, ctx: ApplicationContext) => {
        const occObj = createOCCBottle(width, height, thickness, ctx.occService.occContext);
        const mobject = new MBrepShell(occ2brep(occObj, ctx.occService.occContext));
        return {
            consumed: [],
            created: [mobject]
        };
    }
}
