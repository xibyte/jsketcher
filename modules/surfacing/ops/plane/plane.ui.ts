import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSurfacingScene} from "../../models/MSurfacingScene";
import {createPatchPlane} from './plane.command';
import {PatchCage} from "../../PatchCage";
import {BiRectangle} from "react-icons/bi";

interface PatchPlaneParams {
  width: number;
  height: number;
  resolution: number;
}

export const PatchPlaneOperation: OperationDescriptor<PatchPlaneParams> = {
  id: 'PATCH_PLANE',
  label: 'Patch Plane',
  icon: BiRectangle,
  info: 'Create a Bézier patch plane',
  path: __dirname,
  paramsInfo: ({width, height}) => `(${width}x${height})`,
  run: (params: PatchPlaneParams, ctx: ApplicationContext, rawParams: any) => {
    const cage = rawParams?.cageState
      ? PatchCage.deserialize(rawParams.cageState)
      : createPatchPlane(params.width, params.height);
    return {consumed: [], created: [new MSurfacingScene(cage, params.resolution)]};
  },
  form: [
    {type: 'number', name: 'width', label: 'Width', defaultValue: 100},
    {type: 'number', name: 'height', label: 'Height', defaultValue: 100},
    {type: 'number', name: 'resolution', label: 'Resolution', defaultValue: 8, min: 2, max: 32},
  ],
};
