import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSubD} from "cad/model/msubd";
import {createSubDBox} from "subd/primitives";
import {GiCube} from "react-icons/gi";

interface SubDBoxParams {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  subdivisions: number;
}

export const SubDBoxOperation: OperationDescriptor<SubDBoxParams> = {
  id: 'SUBD_BOX',
  label: 'SubD Box',
  icon: GiCube,
  info: 'Create a Catmull-Clark subdivision box',
  path: __dirname,
  paramsInfo: ({sizeX, sizeY, sizeZ, subdivisions}) => `(${sizeX}x${sizeY}x${sizeZ} sub:${subdivisions})`,

  run: (params: SubDBoxParams, ctx: ApplicationContext) => {
    const controlMesh = createSubDBox(params.sizeX, params.sizeY, params.sizeZ);
    const mSubD = new MSubD(controlMesh, params.subdivisions);
    return {
      consumed: [],
      created: [mSubD],
    };
  },

  form: [
    {type: 'number', name: 'sizeX', label: 'Width', defaultValue: 100},
    {type: 'number', name: 'sizeY', label: 'Depth', defaultValue: 100},
    {type: 'number', name: 'sizeZ', label: 'Height', defaultValue: 100},
    {type: 'number', name: 'subdivisions', label: 'Subdivisions', defaultValue: 2, min: 0, max: 5},
  ],
};
