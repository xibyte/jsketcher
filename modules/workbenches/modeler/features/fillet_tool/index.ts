import { ApplicationContext } from 'context';
import { MBrepShell } from 'cad/model/mshell';
import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { occ2brep } from 'cad/occ/occ2models';
import icon32 from './icon32.png';
import icon96 from './icon96.png';
import {EntityKind} from "cad/model/entities";

export default {
    id: 'fillet_tool',
    label: 'fillet_tool',
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
    info: 'fillet_tool',
    mutualExclusiveFields: [],
    paramsInfo: ({ size, }) => `(${r(size)} })`,
    form: [
        {
            type: 'number',
            label: 'size',
            name: 'size',
            defaultValue: 5,
        },
        {
            type: 'selection',
            name: 'edges',
            capture: [EntityKind.EDGE],
            label: 'edges',
            multi: false,
            defaultValue: {
                usePreselection: true,
                preselectionIndex: 0
            },
        },

    ],

    run: (params, ctx: ApplicationContext) => {

        let occ = ctx.occService;
        const oci = occ.commandInterface;
        // ctx.occService.io.pushModel(params.edges.shell, "bodyToBeFillet");
        //
        // ctx.occService.io.pushModel(params.edges, "edgeToFillet");



        oci.blend("b", params.edges.shell, params.size, params.edges);


        return {
            consumed: [params.edges.shell],
            created: [occ.io.getShell("b")]
        };    },

}

