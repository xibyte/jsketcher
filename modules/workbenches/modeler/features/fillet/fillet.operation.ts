import {TbSquare, TbCircleHalf} from 'react-icons/tb';
import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {MEdge} from "cad/model/medge";
import {MShell} from "cad/model/mshell";
import {MBrepFace} from 'cad/model/mface';

interface FilletParams {
  edges: MEdge[] | MBrepFace[],
  size: number,
  opperationType: 'Champher' | 'Fillet'
}

export const FilletOperation: OperationDescriptor<any> = {
  id: 'FILLET_TOOL',
  label: 'Fillet',
  icon: TbCircleHalf,
  info: 'Fillet/Chamfer edges',
  path: __dirname,
  paramsInfo: ({size, opperationType}) => `(${r(size)} ${r(opperationType)})`,
  run: (params: FilletParams, ctx: ApplicationContext) => {
    const opType = params.opperationType || 'Fillet';
    const occ = ctx.occService;
    const oci = occ.commandInterface;
    let edgeList = [];
    params.edges.forEach((edge) => {
      if (edge.TYPE === EntityKind.FACE) {
        edgeList = edgeList.concat(edge.edges);
      }
      if (edge.TYPE === EntityKind.EDGE) {
        edgeList.push(edge);
      }
    });
    const groups = new Map<MShell, any[]>();
    edgeList.forEach((edge) => {
      let shellArgs = groups.get(edge.shell);
      if (!shellArgs) {
        shellArgs = [];
        groups.set(edge.shell, shellArgs);
      }
      if (opType == "Fillet") {
        shellArgs.push(params.size, edge);
      } else if (opType == "Champher") {
        shellArgs.push(edge, params.size);
      } else {
        throw 'unsupported';
      }
    });
    let result = {
      created: [],
      consumed: Array.from(groups.keys()),
      error: {},
    };
    const analyzer = new FromMObjectProductionAnalyzer(result.consumed);
    groups.forEach((shellArgs, shellToOpperateOn) => {
      const newShellName = shellToOpperateOn.id + '/MOD';
      if (opType == "Fillet") {
        oci.blend(newShellName, shellToOpperateOn, ...shellArgs);
      } else if (opType == "Champher") {
        oci.chamf(newShellName, shellToOpperateOn, ...shellArgs);
      } else {
        throw 'unsupported';
      }
      result.created.push(occ.io.getShell(newShellName, analyzer));
    });
    if (result.created.length > 0 && result.created[0].faces.length <= 1) {
      return {
        created: [],
        consumed: [],
        error: {
          type: "fail",
          message: "Fillet/Chamfer failed. Try changing size or selecting different edges."
        }
      };
    }
    return result;
  },
  form: [
    {
      type: 'selection',
      name: 'edges',
      capture: [EntityKind.EDGE, EntityKind.FACE],
      label: 'edges',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'number',
      label: 'size',
      name: 'size',
      defaultValue: 5,
    },
  ],
  masking: [
    {
      id: 'CHAMFER_TOOL',
      label: 'Chamfer',
      icon: TbSquare,
      info: 'Chamfer selected edges',
      maskingParams: {
        opperationType: 'Champher'
      }
    }
  ]
}