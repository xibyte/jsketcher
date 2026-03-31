import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";

interface smTabParams {
  thickness: number;
  bendRadius: number;
  kFactor: number;
  flipper: boolean;
  sketch: MFace;
  boolean: BooleanDefinition;
}


export const smTabOperation: OperationDescriptor<smTabParams> = {
  id: 'SM_TAB',
  label: 'SM Tab',
  icon: 'img/cad/smTab',
  info: 'Create tab from sketch',
  path:__dirname,
  paramsInfo: ({ thickness, bendRadius }) => `(${r(thickness)}  ${r(bendRadius)}  )`,
  run: (params: smTabParams, ctx: ApplicationContext) => {
    throw 'SM_TAB operation is not yet implemented with native engine';
  },


  form: [
    {
      type: 'number',
      label: 'Thickness',
      name: 'thickness',
      defaultValue: 1,
    },
    {
      type: 'number',
      label: 'Bend Radius',
      name: 'bendRadius',
      defaultValue: 2,
    },
    {
      type: 'number',
      label: 'K-Factor',
      name: 'kFactor',
      defaultValue: 0.35,
    },
    {
      type: 'checkbox',
      label: 'flip',
      name: 'flipper',
      defaultValue: false,
    },
    {
      type: 'selection',
      name: 'sketch',
      capture: [EntityKind.FACE],
      label: 'Sketch',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}
