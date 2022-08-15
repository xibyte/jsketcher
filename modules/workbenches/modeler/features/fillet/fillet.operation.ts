import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';

import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {MEdge} from "cad/model/medge";
import {MObject} from "cad/model/mobject";
import {MShell} from "cad/model/mshell";

interface FilletParams {
  edges: MEdge[],
  size: number
  opperationType: 'Champher'|'Fillet'
}

export const FilletOperation: OperationDescriptor<any> = {
  id: 'FILLET_TOOL',
  label: 'Fillet/Chapher',
  icon: 'img/cad/fillet',
  info: 'Fillet/Champher',
  path:__dirname,
  paramsInfo: ({size, opperationType,}) => `(${r(size)} ${r(opperationType)}})`,
  run: (params: FilletParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;

    //add all the edges and size to seperate arrays for each shell that edges are selected from

    const groups = new Map<MShell, any[]>()

    params.edges.forEach((edge) => {

      let shellArgs = groups.get(edge.shell);
      if (!shellArgs) {
        shellArgs = [];
        groups.set(edge.shell, shellArgs);
      }

      if (params.opperationType == "Fillet") {
        //order of parameters is diferent between fillet and champher
        shellArgs.push(params.size, edge);
      } else if (params.opperationType == "Champher") {
        //order of parameters is diferent between fillet and champher
        shellArgs.push(edge, params.size);
      } else {
        throw 'unsupported';
      }
    });

    //perform the opperations on each of the bodies.
    const result = {
      created: [],
      consumed: Array.from(groups.keys())
    }

    const analyzer = new FromMObjectProductionAnalyzer(result.consumed);
    groups.forEach((shellArgs, shellToOpperateOn) => {
      const newShellName = shellToOpperateOn.id+'/MOD';
      if (params.opperationType == "Fillet") {
        oci.blend(newShellName, shellToOpperateOn, ...shellArgs);
      } else if (params.opperationType == "Champher") {
        oci.chamf(newShellName, shellToOpperateOn, ...shellArgs);
      } else {
        throw 'unsupported';
      }
      result.created.push(occ.io.getShell(newShellName, analyzer));
    });

    return result;
  },
  form: [
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
    {
      type: 'choice',
      style: "dropdown",
      label: 'opperationType',
      name: 'opperationType',
      values: ["Fillet", "Champher"],
      defaultValue: "Fillet",
    },
    {
      type: 'number',
      label: 'size',
      name: 'size',
      defaultValue: 5,
    },
  ],
}

