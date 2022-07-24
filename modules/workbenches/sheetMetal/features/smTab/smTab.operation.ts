import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";
import { FromSketchProductionAnalyzer } from "cad/craft/production/productionAnalyzer";
import { FaceRef } from "cad/craft/e0/OCCUtils";

interface smTabParams {
  thickness: number;
  bendRadius: number;
  kFactor: number;
  flipper: boolean;
  sketch: MFace;
  boolean: BooleanDefinition;
}

export const smTabOperation: OperationDescriptor<smTabParams> = {
  id: 'SM_TAB',
  label: 'SM Tab',
  icon: 'img/cad/smTab',
  info: 'Create tab from sketch',
  paramsInfo: ({ thickness, bendRadius }) => `(${r(thickness)}  ${r(bendRadius)}  )`,
  run: (params: smTabParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    console.log(ctx.craftService.modifications$.value.history);
    const oci = occ.commandInterface;

    const face = params.sketch;

    let sketch = ctx.sketchStorageService.readSketch(face.id);
    if (!sketch) throw 'sketch not found for the face ' + face.id;

  

    const occFaces = occ.utils.sketchToFaces(sketch, face.csys);

    const dir: UnitVector = face.normal();

    let extrusionVector = {};
    if (params.flipper == true) {
      extrusionVector = dir.normalize()._multiply(params.thickness);
    } else {
      extrusionVector = dir.normalize()._multiply(params.thickness).negate();
    }





    const productionAnalyzer = new FromSketchProductionAnalyzer(occFaces,"SM/FLAT/A", "SM/FLAT/B","SM/THICKNESS");
    console.log(productionAnalyzer);

    const tools = occFaces.map((faceRef, i) => {

      const faceName = faceRef.face;
      const shapeName = "Tool/" + i;
      oci.prism(shapeName, faceName, ...extrusionVector.data());
      return shapeName;
    }).map(shapeName => occ.io.getShell(shapeName, productionAnalyzer));


    return occ.utils.applyBooleanModifier(tools, params.boolean, face, [face]);

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
