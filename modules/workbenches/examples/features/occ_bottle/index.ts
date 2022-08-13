import {ApplicationContext} from 'context';
import {MBrepShell} from 'cad/model/mshell';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {createOCCBottle} from './bottle.occ';
import {occ2brep} from 'cad/occ/occ2models';
import icon from './icon.svg';
import {OperationDescriptor} from "cad/craft/operationPlugin";

export const OCCBottle:OperationDescriptor<any> = {
  id: 'OCC_BOTTLE',
  label: 'OCC Bottle',
  icon: {
    iconType: 'svg',
    iconContent: icon
  },
  info: 'create occ bottle',
  paramsInfo: ({width, height, thickness, color}) => `(${r(width)} ${r(height)} ${r(thickness)}  ${r(color)})`,
  form: [],
  run: ({width, height, thickness, color}, ctx: ApplicationContext) => {
    const occObj = createOCCBottle(width, height, thickness, ctx.occService.occContext);
    const mobject = new MBrepShell(occ2brep(occObj, ctx.occService.occContext));
    return {
      consumed: [],
      created: [mobject]
    };
  }
}
