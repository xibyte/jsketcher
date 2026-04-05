import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSubD} from "cad/model/msubd";
import {createSubDSphere} from "subd/primitives";
import {BiCircle} from "react-icons/bi";

interface SubDSphereParams {
  radius: number;
  subdivisions: number;
}

export const SubDSphereOperation: OperationDescriptor<SubDSphereParams> = {
  id: 'SUBD_SPHERE',
  label: 'SubD Sphere',
  icon: BiCircle,
  info: 'Create a Catmull-Clark subdivision sphere',
  path: __dirname,
  paramsInfo: ({radius, subdivisions}) => `(r:${radius} sub:${subdivisions})`,

  run: (params: SubDSphereParams, ctx: ApplicationContext) => {
    const controlMesh = createSubDSphere(params.radius);
    const mSubD = new MSubD(controlMesh, params.subdivisions);
    return {
      consumed: [],
      created: [mSubD],
    };
  },

  form: [
    {type: 'number', name: 'radius', label: 'Radius', defaultValue: 50},
    {type: 'number', name: 'subdivisions', label: 'Subdivisions', defaultValue: 3, min: 0, max: 6},
  ],
};
