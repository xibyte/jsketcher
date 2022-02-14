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
            multi: true,
            defaultValue: {
                usePreselection: true,
                preselectionIndex: 0
            },
        },

    ],

    run: (params, ctx: ApplicationContext) => {

        let occ = ctx.occService;
        const oci = occ.commandInterface;

        var edgesAndValue = [];

        params.edges.forEach((edge) => {
            edgesAndValue.push(params.size);
            edgesAndValue.push(edge);
            
        });

        console.log(edgesAndValue);

        oci.blend("b", params.edges[0].shell, ...edgesAndValue);


        return {
            consumed: [params.edges[0].shell],
            created: [occ.io.getShell("b")]
        };    },

}

