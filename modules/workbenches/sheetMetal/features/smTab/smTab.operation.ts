import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FromSketchProductionAnalyzer} from "cad/craft/production/productionAnalyzer";

interface smTabParams {
  thickness: number;
  bendRadius: number;
  kFactor: number;
  flipper: boolean;
  sketch: MFace;
  boolean: BooleanDefinition;
}


const ROLE_TO_SM_KIND = {
  'base': 'FLAT/A',
  'lid': 'FLAT/B',
  'sweep': 'THICKNESS'
}


export const smTabOperation: OperationDescriptor<smTabParams> = {
  id: 'SM_TAB',
  label: 'SM Tab',
  icon: 'img/cad/smTab',
  info: 'Create tab from sketch',
  path:__dirname,
  paramsInfo: ({ thickness, bendRadius }) => `(${r(thickness)}  ${r(bendRadius)}  )`,
  run: (params: smTabParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.sketch;

    const sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) {
      throw 'sketch not found for the face ' + face.id;
    }

    const occFaces = occ.utils.sketchToFaces(sketch, face.csys);

    const dir: UnitVector = face.normal();

    let extrusionVector;
    if (params.flipper == true) {
      extrusionVector = dir.normalize()._multiply(params.thickness);
    } else {
      extrusionVector = dir.normalize()._multiply(params.thickness).negate();
    }

    const productionAnalyzer = new FromSketchProductionAnalyzer(occFaces);

    const tools = occFaces.map((faceRef, i) => {

      const faceName = faceRef.face;
      const shapeName = "Tool/" + i;
      oci.prism(shapeName, faceName, ...extrusionVector.data());
      return shapeName;
    }).map(shapeName => occ.io.getShell(shapeName, productionAnalyzer));


    const operationResult = occ.utils.applyBooleanModifier(tools, params.boolean, face, [face]);

    operationResult.created.forEach(shell => {
      shell.traverse(obj => {
        if (obj.productionInfo?.role) {
          obj.productionInfo.sheetMetal = {
            kind: ROLE_TO_SM_KIND[obj.productionInfo.role]
          }
        }
      })
    });

    return operationResult;

  },


  form: [
    {
      type: 'number',
      label: 'Thickness',
      name: 'thickness',
      defaultValue: 1,
    },
    {
      type: 'number',
      label: 'Bend Radius',
      name: 'bendRadius',
      defaultValue: 2,
    },
    {
      type: 'number',
      label: 'K-Factor',
      name: 'kFactor',
      defaultValue: 0.35,
    },
    {
      type: 'checkbox',
      label: 'flip',
      name: 'flipper',
      defaultValue: false,
    },
    {
      type: 'selection',
      name: 'sketch',
      capture: [EntityKind.FACE],
      label: 'Sketch',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}
