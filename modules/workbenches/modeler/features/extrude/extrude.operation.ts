import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface ExtrudeParams {
  length: number;
  doubleSided:boolean,
  face: MFace;
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

    let sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) {
      occFaces.push(params.face);
    } else {
      occFaces = occ.utils.sketchToFaces(sketch, face.csys);
    }





    const dir: UnitVector = params.direction || face.normal();

    const extrusionVector = dir.normalize()._multiply(params.length).data();
    const extrusionVectorFliped = dir.normalize()._multiply(params.length).negate().data();


    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      oci.prism(shapeName, faceName, ...extrusionVector);

      if(params.doubleSided){
        oci.prism(shapeName + "B", faceName, ...extrusionVectorFliped);
        oci.bop(shapeName, shapeName + "B");
        oci.bopfuse(shapeName);
      }


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
    // {
    //   type: 'vector',
    //   name: 'direction',
    //   label: 'direction'
    // },
    // {
    //   type: 'boolean',
    //   name: 'boolean',
    //   label: 'boolean',
    //   defaultValue: {
    //     implyItFromField: 'face'
    //   }
    // },
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
