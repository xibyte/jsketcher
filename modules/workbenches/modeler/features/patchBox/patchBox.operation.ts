import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MPatchCage} from "cad/model/mpatchcage";
import {createPatchBox} from "patchCage/primitives";
import {GiCube} from "react-icons/gi";

interface PatchBoxParams {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  resolution: number;
}

export const PatchBoxOperation: OperationDescriptor<PatchBoxParams> = {
  id: 'PATCH_BOX',
  label: 'Patch Box',
  icon: GiCube,
  info: 'Create a Bézier patch box (6 Coons patches)',
  path: __dirname,
  paramsInfo: ({sizeX, sizeY, sizeZ}) => `(${sizeX}x${sizeY}x${sizeZ})`,
  run: (params: PatchBoxParams, ctx: ApplicationContext) => {
    const cage = createPatchBox(params.sizeX, params.sizeY, params.sizeZ);
    return {consumed: [], created: [new MPatchCage(cage, params.resolution)]};
  },
  form: [
    {type: 'number', name: 'sizeX', label: 'Width', defaultValue: 100},
    {type: 'number', name: 'sizeY', label: 'Depth', defaultValue: 100},
    {type: 'number', name: 'sizeZ', label: 'Height', defaultValue: 100},
    {type: 'number', name: 'resolution', label: 'Resolution', defaultValue: 8, min: 2, max: 32},
  ],
};
