import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MBrepFace, MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import Axis from "math/axis";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {FaceRef} from "cad/craft/e0/OCCUtils";
import {FromMObjectProductionAnalyzer, FromSketchProductionAnalyzer} from "cad/craft/production/productionAnalyzer";

interface RevolveParams {
  angle: number;
  face: MFace;
  axis: Axis,
  boolean: BooleanDefinition
}

export const RevolveOperation: OperationDescriptor<RevolveParams> = {
  id: 'REVOLVE',
  label: 'Revolve',
  icon: 'img/cad/revolve',
  info: 'Revolves 2D sketch',
  path:__dirname,
  paramsInfo: ({angle}) => `(${r(angle)})`,
  run: (params: RevolveParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

    const sketchId = face.id;
    const sketch = ctx.sketchStorageService.readSketch(sketchId);

    if (!sketch) {
      if (face instanceof MBrepFace) {
        const args = ["FaceTool", face, ...params.axis.origin.data(), ...params.axis.direction.data(), params.angle];
        oci.revol(...args);
        return occ.utils.applyBooleanModifier([occ.io.getShell("FaceTool")], params.boolean, face, [],
          (targets, tools) => new FromMObjectProductionAnalyzer(targets, [face]));
      } else {
        throw "can't extrude an empty surface";
      }
    }

    const csys = face.csys;

    const sweepSources = occ.utils.sketchToFaces(sketch, csys)

    const productionAnalyzer = new FromSketchProductionAnalyzer(sweepSources);

    const tools = sweepSources.map((faceRef, i) => {
      const faceName = faceRef.face;
      const shapeName = "Tool/" + i;
      const args = [shapeName, faceName, ...params.axis.origin.data(), ...params.axis.direction.data(), params.angle];
      oci.revol(...args);
      return shapeName;
    }).map(shapeName => occ.io.getShell(shapeName, productionAnalyzer));


    return occ.utils.applyBooleanModifier(tools, params.boolean, face, [face]);

  },
  form: [
    {
      type: 'number',
      label: 'angle',
      name: 'angle',
      defaultValue: 360,
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
      type: 'axis',
      name: 'axis',
      label: 'axis',
      optional: false
    },
    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
      defaultValue: 'NONE'
    }

  ],
}
