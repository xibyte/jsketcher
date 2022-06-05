import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MBrepFace, MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {UnitVector} from "math/vector";
import {OperationDescriptor} from "cad/craft/operationPlugin";
import {MObject} from "cad/model/mobject";
import {Edge} from "brep/topo/edge";
import {FaceRef} from "cad/craft/e0/OCCUtils";
import {GetRef} from "cad/craft/e0/interact";
import {
  FromMObjectProductionAnalyzer,
  FromSketchProductionAnalyzer,
  ProductionAnalyzer
} from "cad/craft/production/productionAnalyzer";


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

    if (params.profiles?.length > 0) {

      params.profiles

    }
    const dir: UnitVector = (params.direction || face.normal()).normalize();
    let extrusionVector = dir._multiply(params.length);

    let sketchId = face.id;
    let sketch = ctx.sketchStorageService.readSketch(sketchId);

    let sweepSources: FaceRef[];

    if (!sketch) {
      if (face instanceof MBrepFace) {
        occ.io.pushModel(face, face.id)
        const edges = face.edges;
        edges.forEach(e => occ.io.pushModel(e, e.id));
        sweepSources = [{
          face: face.id,
          edges: edges.map(e => e.id)
        }];
      } else {
        throw "can't extrude an empty surface";
      }
    } else {
      let csys = face.csys;
      if (params.doubleSided) {
        csys = csys.clone();
        csys.origin._minus(extrusionVector);
        extrusionVector._scale(2);
      }
      sweepSources = occ.utils.sketchToFaces(sketch, csys)
    }

    const productionAnalyzer = new FromSketchProductionAnalyzer(sweepSources);

    const tools = sweepSources.map((faceRef, i) => {

      const faceName = faceRef.face;
      const shapeName = "Tool/" + i;

      // for (let i = 0; i < faceRef.edges.length; ++i) {
      //   const edge = faceRef.edges[i];
      //   const seg = faceRef.contour.segments[i];
      //   const ref = GetRef(edge);
      //   productionAnalyzer.mapRef(ref, `SK[${sketchId}:${seg.id}]`);
      // }

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

    // const productionAnalyzer = new ProductionAnalyzer();
    // ctx.cadRegistry.models.forEach(m => productionAnalyzer.preRegister(m));

    return occ.utils.applyBooleanModifier(tools, params.boolean, productionAnalyzer, [face]);

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
