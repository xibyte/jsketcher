import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MPatchCage} from "cad/model/mpatchcage";
import {createPatchCylinder} from "patchCage/primitives";
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
  run: (params: PatchCylinderParams, ctx: ApplicationContext) => {
    const cage = createPatchCylinder(params.radius, params.height, params.segments);
    return {consumed: [], created: [new MPatchCage(cage, params.resolution)]};
  },
  form: [
    {type: 'number', name: 'radius', label: 'Radius', defaultValue: 50},
    {type: 'number', name: 'height', label: 'Height', defaultValue: 100},
    {type: 'number', name: 'segments', label: 'Segments', defaultValue: 8, min: 4, max: 32},
    {type: 'number', name: 'resolution', label: 'Resolution', defaultValue: 8, min: 2, max: 32},
  ],
};
