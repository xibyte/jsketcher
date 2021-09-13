import { ApplicationContext } from 'context';
import { MBrepShell } from '../../../web/app/cad/model/mshell';
import { roundValueForPresentation as r } from '../../../web/app/cad/craft/operationHelper';
import { createOCCBottle } from './bottle.occ';
import { occ2brep } from '../../../web/app/cad/occ/occ2models';

export const OCC_BOTTLE_OPERATION = {
    id: 'OCC_BOTTLE',
    label: 'OCC Bottle',
    icon: 'img/cad/extrude',
    info: 'create occ bottle',
    mutualExclusiveFields: [],
    paramsInfo: ({ width, height, thickness }) => `(${r(width)} ${r(height)} ${r(thickness)})`,
    run: ({ width, height, thickness }, ctx: ApplicationContext) => {
        const occObj = createOCCBottle(width, height, thickness, ctx.occService.occContext);
        const mobject = new MBrepShell(occ2brep(occObj, ctx.occService.occContext));      
        return {
            consumed: [],
            created: [mobject]
        };
    },
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
    }
}
