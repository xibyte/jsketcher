import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { OperationDescriptor } from "cad/craft/operationBundle";
import icon from "./WireLine.svg";
import { MDatum } from 'cad/model/mdatum';


interface WireLineParams {
  points: MDatum[];
}

export const WireLineOperation: OperationDescriptor<WireLineParams> = {
  id: 'WIRE_LINE',
  label: 'Line',
  icon: icon,
  info: 'Create Wire Line',
  path: __dirname,
  paramsInfo: ({ points }) => `(${r(points)})`,
  run: (params: WireLineParams, ctx: ApplicationContext) => {
    throw 'WIRE_LINE operation is not yet implemented with native engine';
  },
  form: [
    {
      type: 'selection',
      name: 'points',
      capture: [EntityKind.DATUM],
      label: 'points',
      optional: false,
      multi: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
  ],
}
