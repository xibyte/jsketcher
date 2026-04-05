import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSubD} from "cad/model/msubd";
import {createSubDCylinder} from "subd/primitives";
import {BiCylinder} from "react-icons/bi";

interface SubDCylinderParams {
  radius: number;
  height: number;
  segments: number;
  subdivisions: number;
  topCrease: number;
  bottomCrease: number;
}

export const SubDCylinderOperation: OperationDescriptor<SubDCylinderParams> = {
  id: 'SUBD_CYLINDER',
  label: 'SubD Cylinder',
  icon: BiCylinder,
  info: 'Create a Catmull-Clark subdivision cylinder with crease control',
  path: __dirname,
  paramsInfo: ({radius, height, subdivisions}) => `(r:${radius} h:${height} sub:${subdivisions})`,

  run: (params: SubDCylinderParams, ctx: ApplicationContext) => {
    const topCreaseInternal = (params.topCrease / 100) * 10;
    const bottomCreaseInternal = (params.bottomCrease / 100) * 10;
    const result = createSubDCylinder(
      params.radius, params.height, params.segments,
      topCreaseInternal, bottomCreaseInternal
    );
    const mSubD = new MSubD(result.mesh, params.subdivisions, result.caps);
    return {
      consumed: [],
      created: [mSubD],
    };
  },

  form: [
    {type: 'number', name: 'radius', label: 'Radius', defaultValue: 50},
    {type: 'number', name: 'height', label: 'Height', defaultValue: 100},
    {type: 'number', name: 'segments', label: 'Segments', defaultValue: 8, min: 4, max: 32},
    {type: 'number', name: 'subdivisions', label: 'Subdivisions', defaultValue: 2, min: 0, max: 5},
    {type: 'number', name: 'topCrease', label: 'Top Crease %', defaultValue: 100, min: 0, max: 100},
    {type: 'number', name: 'bottomCrease', label: 'Bottom Crease %', defaultValue: 100, min: 0, max: 100},
  ],
};
