import {TbScissors} from 'react-icons/tb';
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MShell} from 'cad/model/mshell';

interface SplitBodyParams {
  body: MShell;
  tool: MShell;
}

export const SplitBodyOperation: OperationDescriptor<SplitBodyParams> = {
  id: 'SPLIT_BODY',
  label: 'Split Body',
  icon: TbScissors,
  info: 'Splits a body using a face or plane',
  path: __dirname,
  paramsInfo: () => `(?)`,
  run: (params: SplitBodyParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const bodyPushed = occ.io.pushModel(params.body, '__SplitBody__');
    if (!bodyPushed) {
      throw new Error('Split Body: could not get body geometry handle');
    }

    const toolPushed = occ.io.pushModel(params.tool, '__SplitTool__');
    if (!toolPushed) {
      throw new Error('Split Body: could not get cutting face handle');
    }

    oci.bclearobjects();
    oci.bcleartools();
    oci.baddobjects('__SplitBody__');
    oci.baddtools('__SplitTool__');
    oci.bfillds();
    oci.bapisplit('SplitResult');
    oci.explode('SplitResult');

    const consumed = [params.body];
    const created = [];
    for (let i = 1; i <= 20; i++) {
      try {
        const shell = occ.io.getShell(`SplitResult_${i}`);
        if (!shell || shell.faces.length === 0) break;
        created.push(shell);
      } catch(e) {
        break;
      }
    }

    if (created.length === 0) {
      throw new Error('Split produced no result. Make sure the cutting face intersects the body.');
    }

    return { created, consumed };
  },
  form: [
    {
      type: 'selection',
      name: 'body',
      capture: [EntityKind.SHELL],
      label: 'Body to Split',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'selection',
      name: 'tool',
      capture: [EntityKind.SHELL],
      label: 'Cutting Body',
      multi: false,
      defaultValue: {
        usePreselection: false,
        preselectionIndex: 0
      },
    },
  ],
}
