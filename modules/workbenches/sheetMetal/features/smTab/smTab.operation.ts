import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition } from "cad/craft/schema/common/BooleanDefinition";
import { UnitVector } from "math/vector";
import { OperationDescriptor } from "cad/craft/operationPlugin";


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

    const occFaces = occ.utils.sketchToFaces(sketch, face.csys).map(ref => ref.face);

    const dir: UnitVector= face.normal();

    let extrusionVector =[];
    if (params.flipper == true){
       extrusionVector = dir.normalize()._multiply(params.thickness).data();
    } else {
       extrusionVector = dir.normalize()._multiply(params.thickness).negate().data();
    }
    

    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      const bla = oci.prism(shapeName, faceName, ...extrusionVector);
      console.log(bla);
      return shapeName;
    });


    return occ.utils.applyBooleanModifier(tools, params.boolean);

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
