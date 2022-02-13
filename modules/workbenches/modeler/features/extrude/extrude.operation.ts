import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {MDFCommand} from "cad/mdf/mdf";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import Axis from "math/axis";

interface ExtrudeParams {
  length: number;
  face: MFace;
  direction?: Axis,
  boolean: BooleanDefinition
}

const ExtrudeOperation: MDFCommand<ExtrudeParams> = {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo: ({length}) => `(${r(length)})`,
  mutualExclusiveFields: ['datumAxisVector', 'edgeVector', 'sketchSegmentVector'],
  run: (params: ExtrudeParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

    let sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) throw 'sketch not found for the face ' + face.id;

    const occFaces = occ.utils.sketchToFaces(sketch, face.csys);

    const dir = (params.direction && params.direction.direction) || face.normal();

    const extrusionVector = dir.normalize()._multiply(params.length).data();

    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      oci.prism(shapeName, faceName, ...extrusionVector)

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
      type: 'axis',
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

export default ExtrudeOperation;