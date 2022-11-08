import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MBrepFace, MFace} from "cad/model/mface";
import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MObject} from "cad/model/mobject";
import {FaceRef} from "cad/craft/e0/OCCUtils";
import {FromSketchProductionAnalyzer, PushPullFaceProductionAnalyzer} from "cad/craft/production/productionAnalyzer";
import icon from "./EXTRUDE.svg";
import iconCut from "./CUT.svg";

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
  dynamicLabel: params => {
    switch (params.boolean?.kind) {
      case 'SUBTRACT': return 'Extrude-Cut';
      case 'INTERSECT': return 'Extrude-Intersect';
      case 'UNION': return 'Extrude-Fuse';
    }
    return null;
  },
  icon,
  info: 'extrudes 2D sketch',
  path:__dirname,
  paramsInfo: ({length}) => `(${r(length)})`,
  run: (params: ExtrudeParams, ctx: ApplicationContext, rawParams: any) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

    let dir: UnitVector;
    if (params.direction) {
      dir = params.direction.normalize();
    } else {
      dir = face.normal().normalize();
      if (rawParams.direction?.flip) {
        dir._negate();
      }
    }
    const extrusionVector = dir._multiply(params.length);

    const sketchId = face.id;
    const sketch = ctx.sketchStorageService.readSketch(sketchId);

    if (!sketch) {
      if (face instanceof MBrepFace) {
        oci.prism("FaceTool", face, ...extrusionVector.data());
        return occ.utils.applyBooleanModifier([occ.io.getShell("FaceTool")], params.boolean, face, [],
          (targets, tools) => new PushPullFaceProductionAnalyzer(targets, face.brepFace));
      } else {
        throw "can't extrude an empty surface";
      }
    }

    let csys = face.csys;
    if (params.doubleSided) {
      csys = csys.clone();
      csys.origin._minus(extrusionVector);
      extrusionVector._scale(2);
    }
    const sweepSources = occ.utils.sketchToFaces(sketch, csys)

    const productionAnalyzer = new FromSketchProductionAnalyzer(sweepSources);

    const tools = sweepSources.map((faceRef, i) => {

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

  defaultActiveField: 'face',

  masking: [
    {
      id: 'CUT',
      label: 'Cut',
      icon: iconCut,
      info: 'makes a cut based on 2D sketch',
      maskingParams: {
        direction: {
          flip: true
        },
        boolean: {
          kind: 'SUBTRACT',
          simplify: true,
        }
      }
    }
  ]
}
