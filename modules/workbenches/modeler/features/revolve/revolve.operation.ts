import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MBrepFace, MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import Axis from "math/axis";
import {OperationDescriptor} from "cad/craft/operationBundle";

interface RevolveParams {
  angle: number;
  face: MFace;
  axis: Axis,
  boolean: BooleanDefinition
}

export const RevolveOperation: OperationDescriptor<RevolveParams> = {
  id: 'REVOLVE',
  label: 'Revolve',
  icon: 'img/cad/revolve',
  info: 'Revolves 2D sketch',
  path:__dirname,
  paramsInfo: ({angle}) => `(${r(angle)})`,
  run: (params: RevolveParams, ctx: ApplicationContext) => {
    throw 'REVOLVE operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'number',
      label: 'angle',
      name: 'angle',
      defaultValue: 360,
    },
    {
      type: 'selection',
      name: 'face',
      capture: [EntityKind.FACE],
      label: 'face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'axis',
      name: 'axis',
      label: 'axis',
      optional: false
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
      defaultValue: 'NONE'
    }

  ],
}
