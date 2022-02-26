import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import Axis from "math/axis";
import { OperationDescriptor } from "cad/craft/operationPlugin";

interface smFlangeParams {
  angle: number;
  face: MFace;
  axis: Axis,
  boolean: BooleanDefinition
}

export const smFlangeOperation: OperationDescriptor<smFlangeParams> = {
  id: 'SM_FLANGE',
  label: 'Flange',
  icon: 'img/cad/smFlange',
  info: 'Creates Sheet metal flange',
  paramsInfo: ({ angle }) => `(${r(angle)})`,
  run: (params: smFlangeParams, ctx: ApplicationContext) => {
    console.log(params);
    let occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

    let occFaces = [face];

    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      var args = [shapeName, faceName, ...params.axis.origin.data(), ...params.axis.direction.negate().data(), params.angle];
      oci.revol(...args);

      return shapeName;
    });


    return occ.utils.applyBooleanModifier(tools, params.boolean);

  },
  form: [
    {
      type: 'number',
      label: 'angle',
      name: 'angle',
      defaultValue: 90,
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
      type: 'selection',
      name: 'Edge',
      capture: [EntityKind.EDGE],
      label: 'Edge',
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
      defaultValue: 'UNION'
    }

  ],
}
