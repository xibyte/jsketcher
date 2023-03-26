import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
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

    let arggs = [];

    params.draftFaces.forEach((faceToDraft) => {
      arggs.push(
        faceToDraft,
        -params.angle,
        ...params.baseFace.csys.origin.data(),
        ...params.baseFace.csys.z.normalize().data()
      )
    });

    //must be a french word for draft
    oci.depouille("result", params.draftFaces[0].shell, ...params.baseFace.csys.z.normalize().data(), ...arggs);


    returnObject.created.push(occ.io.getShell("result"));
    returnObject.consumed.push(params.draftFaces[0].shell)



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
