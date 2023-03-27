import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
import {FromMObjectProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import icon from "./DRAFT.svg";
import { MFace } from 'cad/model/mface';


interface DraftFacesParams {
  draftFaces: MFace[];
  baseFace: MFace;
  angle: number;
}

export const DraftFacesOperation: OperationDescriptor<DraftFacesParams> = {
  id: 'DRAFT_FACES',
  label: 'Draft Faces',
  icon,
  info: 'Add draft angle to faces',
  path: __dirname,
  paramsInfo: ({ tools, boolean }) => `(${r(tools)} ${r(boolean)})`,
  run: (params: DraftFacesParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const returnObject = {
      created: [],
      consumed: []
    };



    const bodiesToDraft = [];
    //add all the edges and size to separate arrays for each shell that edges are selected from

    params.draftFaces.forEach((face) => {
      if (!returnObject.consumed.includes(face.shell)) {
        returnObject.consumed.push(face.shell);
        bodiesToDraft[face.shell.id] = [];
      }
      bodiesToDraft[face.shell.id].push(face);

    });



    //perform the opperations on each of the bodies.
    Object.keys(bodiesToDraft).forEach((shellToOpperateOnName) => {
      const shellToOpperateOn = bodiesToDraft[shellToOpperateOnName];

      console.log(shellToOpperateOn);


      let arggs = [];

      shellToOpperateOn.forEach((faceToDraft) => {
        arggs.push(
          faceToDraft,
          -params.angle,
          ...params.baseFace.csys.origin.data(),
          ...params.baseFace.csys.z.normalize().data()
        )
      });
  
      //must be a french word for draft
      oci.depouille(shellToOpperateOnName+"DRAFT", shellToOpperateOn[0].shell, ...params.baseFace.csys.z.normalize().data(), ...arggs);
  
      returnObject.consumed.push(params.draftFaces[0].shell);
      const analyzer = new FromMObjectProductionAnalyzer([shellToOpperateOn[0].shell]);

      returnObject.created.push(occ.io.getShell(shellToOpperateOnName+"DRAFT", analyzer));


    });








    


    return returnObject;

  },
  form: [
    {
      type: 'selection',
      name: 'draftFaces',
      capture: [EntityKind.FACE],
      label: 'Draft Face',
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'selection',
      name: 'baseFace',
      capture: [EntityKind.FACE],
      label: 'Base Face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'number',
      label: 'angle',
      name: 'angle',
      defaultValue: 5,
    },
  ],

}
