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
    paramsInfo: ({ width, height, thickness, color }) => `(${r(width)} ${r(height)} ${r(thickness)}  ${r(color)})`,
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
        },
        color: {
            type: 'string',
            defaultValue: "red",
            label: 'Color',
            enum: [
                {
                    label: 'Red',
                    value: 'red'
                },
                {
                    label: 'Green',
                    value: 'green'
                },
            ],
        },
    },
    run: ({ width, height, thickness, color }, ctx: ApplicationContext) => {
        const occObj = createOCCBottle(width, height, thickness, ctx.occService.occContext);
        const mobject = new MBrepShell(occ2brep(occObj, ctx.occService.occContext));
        console.log(color);
        return {
            consumed: [],
            created: [mobject]
        };
    }
}
