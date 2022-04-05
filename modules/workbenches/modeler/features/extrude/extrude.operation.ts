import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationPlugin";
import {MObject} from "cad/model/mobject";


interface ExtrudeParams {
  length: number;
  doubleSided:boolean,
  face: MFace;
  profiles: MObject[];
  direction?: UnitVector,
  boolean: BooleanDefinition
}

export const ExtrudeOperation: OperationDescriptor<ExtrudeParams> = {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo: ({length}) => `(${r(length)})`,
  run: (params: ExtrudeParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

 
    let occFaces = [];

    if (params.profiles?.length > 0) {

      params.profiles

    }
    const dir: UnitVector = (params.direction || face.normal()).normalize();
    let extrusionVector = dir._multiply(params.length);

    let sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) {
      occFaces.push(params.face);
    } else {
      let csys = face.csys;
      if (params.doubleSided) {
        csys = csys.clone();
        csys.origin._minus(extrusionVector);
        extrusionVector._scale(2);
      }
      occFaces = occ.utils.sketchToFaces(sketch, csys);
    }

    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      oci.prism(shapeName, faceName, ...extrusionVector.data());

      // occIterateFaces(oc, shape, face => {
      //   let role;
      //   if (face.IsSame(prismAPI.FirstShape())) {
      //     role = "bottom";
      //   } else if (face.IsSame(prismAPI.LastShape())) {
      //     role = "top";
      //   } else {
      //     role = "sweep";
      //   }
      //   getProductionInfo(face).role = role;
      // });
      //
      // occIterateEdges(oc, wire, edge => {
      //   const generatedList = prismAPI.Generated(edge);
      //   occIterateListOfShape(oc, generatedList, face => {
      //     console.log(face);
      //   })
      // })

      return shapeName;
    });

    return occ.utils.applyBooleanModifier(tools, params.boolean);

  },

  // useBoolean: {
  //   booleanField: 'boolean',
  //   impliedTargetField: 'face'
  // },

  form: [
    {
      type: 'number',
      label: 'length',
      name: 'length',
      defaultValue: 50,
    },
    {
      type: 'checkbox',
      label: 'Double Sided',
      name: 'doubleSided',
      defaultValue: false,
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
      name: 'profiles',
      capture: [EntityKind.FACE, EntityKind.LOOP],
      label: 'profiles',
      optional: true,
      multi: true
    },
    {
      type: 'direction',
      name: 'direction',
      label: 'direction',
      optional: true
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}
