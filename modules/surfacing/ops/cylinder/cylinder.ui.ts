import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSurfacingScene} from "../../models/MSurfacingScene";
import {createPatchCylinder} from './cylinder.command';
import {PatchCage} from "../../models/Scene/Scene.entity";
import {BiCylinder} from "react-icons/bi";

interface PatchCylinderParams {
  radius: number;
  height: number;
  segments: number;
  resolution: number;
}

export const PatchCylinderOperation: OperationDescriptor<PatchCylinderParams> = {
  id: 'PATCH_CYLINDER',
  label: 'Patch Cylinder',
  icon: BiCylinder,
  info: 'Create a Bézier patch cylinder (wall patches)',
  path: __dirname,
  paramsInfo: ({radius, height}) => `(r:${radius} h:${height})`,
  run: (params: PatchCylinderParams, ctx: ApplicationContext, rawParams: any) => {
    const cage = rawParams?.cageState
      ? PatchCage.deserialize(rawParams.cageState)
      : createPatchCylinder(params.radius, params.height, params.segments);
    return {consumed: [], created: [new MSurfacingScene(cage, params.resolution)]};
  },
  form: [
    {type: 'number', name: 'radius', label: 'Radius', defaultValue: 50},
    {type: 'number', name: 'height', label: 'Height', defaultValue: 100},
    {type: 'number', name: 'segments', label: 'Segments', defaultValue: 8, min: 4, max: 32},
    {type: 'number', name: 'resolution', label: 'Resolution', defaultValue: 8, min: 2, max: 32},
  ],
};
