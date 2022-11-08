import {ApplicationContext} from 'cad/context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import {MEdge} from "cad/model/medge";
import {MObject} from "cad/model/mobject";
import {MShell} from "cad/model/mshell";
import { MBrepFace } from 'cad/model/mface';
import icon from "./FILLET.svg";

interface FilletParams {
  edges: MEdge[] | MBrepFace[],
  size: number
  opperationType: 'Champher'|'Fillet'
}

export const FilletOperation: OperationDescriptor<any> = {
  id: 'FILLET_TOOL',
  label: 'Fillet/Chapher',
  icon,
  info: 'Fillet/Champher',
  path:__dirname,
  paramsInfo: ({size, opperationType,}) => `(${r(size)} ${r(opperationType)}})`,
  run: (params: FilletParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;
    let edgeList = [];

    //check if input contains faces and if a face is an input add all adjacent edges to list for processing. 
    params.edges.forEach((edge) => {
      if(edge.TYPE === EntityKind.FACE){
        edgeList = edgeList.concat(edge.edges);
      }
      if(edge.TYPE === EntityKind.EDGE){
        edgeList.push(edge);
      }
    });

    
    //add all the edges and size to seperate arrays for each shell that edges are selected from
    const groups = new Map<MShell, any[]>()

    edgeList.forEach((edge) => {
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
    let result = {
      created: [],
      consumed: Array.from(groups.keys()),
      error: {},
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


    result.created.forEach(function (item, index, arr ){
      if (item.faces.length <=1) result = {
        created: [],
        consumed:[],
        error :{
          type:"fail",
          message:"Fillet failed, Try changing radius or remove edge causing failure."
        },
      };
    })





    if (result.created[0].faces.length <=1) result = {
      created: [],
      consumed:[],
      error :{
        type:"fail",
        message:"Fillet failed, Try changing radius or remove edge causing failure."
      },
    };

    return result;
  },
  form: [
    {
      type: 'selection',
      name: 'edges',
      capture: [EntityKind.EDGE,EntityKind.FACE],
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

