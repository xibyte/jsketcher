import { roundValueForPresentation as r } from 'cad/craft/operationHelper';
import { MFace } from "cad/model/mface";
import { ApplicationContext } from "cad/context";
import { EntityKind } from "cad/model/entities";
import { BooleanDefinition, BooleanKind } from "cad/craft/schema/common/BooleanDefinition";
import Axis from "math/axis";
import { OperationDescriptor } from "cad/craft/operationBundle";

interface smFlangeParams {
  angle: number;
  face: MFace;
  flip: boolean;

}

export const smFlangeOperation: OperationDescriptor<smFlangeParams> = {
  id: 'SM_FLANGE',
  label: 'Flange',
  icon: 'img/cad/smFlange',
  info: 'Creates Sheet metal flange',
  path:__dirname,
  paramsInfo: ({ angle }) => `(${r(angle)})`,
  run: (params: smFlangeParams, ctx: ApplicationContext) => {
    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = params.face;

    const occFaces = [face];
    let revolveVector;
    let revolveVectorOrigin;
    let revolveVectorDirection;

    for (let i = 0; i < face.edges.length; i++) {
      const edgeKind = face.edges[i].productionInfo.sheetMetal.kind;
      if (edgeKind == "FLAT/A" && !params.flip) {
        revolveVector = face.edges[i].toAxis();
        revolveVectorOrigin = revolveVector.origin;
        revolveVectorDirection = revolveVector.direction.negate();
        revolveVectorOrigin.z -=2;
      }
      if (edgeKind == "FLAT/B" && params.flip) {
        revolveVector = face.edges[i].toAxis();
        revolveVectorOrigin = revolveVector.origin;
        revolveVectorDirection = revolveVector.direction;
        revolveVectorOrigin.z +=2;
      }
    }

    //revolveVectorOrigin.y -=0;
    //revolveVectorOrigin.z +=2;

    const tools = occFaces.map((faceName, i) => {
      const shapeName = "Tool/" + i;
      const args = [shapeName, faceName, ...revolveVectorOrigin.data(), ...revolveVectorDirection.data(), params.angle];
      oci.revol(...args);

      return shapeName;
    }).map(shapeName => occ.io.getShell(shapeName));

    const booleanOperation = {
      kind: "UNION",
      targets: [params.face.shell]
    }

    tools[0].edges.forEach((newEdge) => {
      params.face.shell.edges.forEach((edgeToLookAt) => {
        if (JSON.stringify(newEdge.topology.data.tessellation) == JSON.stringify(edgeToLookAt.topology.data.tessellation)) {
          console.debug("We have a match", edgeToLookAt.productionInfo.sheetMetal.kind);
          // newEdge.productionInfo = {sheetMetal: {kind: edgeToLookAt.productionInfo.sheetMetal.kind}};
          //newEdge.productionInfo.sheetMetal.kind = edgeToLookAt.productionInfo.sheetMetal.kind;
          console.debug(newEdge, edgeToLookAt);
          console.debug(newEdge.productionInfo);
        }
      });
    });

    return {
      created: tools,
      consumed: []
    }

  },
  form: [
    {
      type: 'number',
      label: 'angle',
      name: 'angle',
      defaultValue: 90,
    },
    {
      type: 'selection',
      name: 'face',
      capture: face => face.TYPE === EntityKind.FACE && face.productionInfo?.sheetMetal?.kind === 'THICKNESS',
      label: 'face',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'checkbox',
      label: 'Flip Direction',
      name: 'flip',
      defaultValue: false,
    },
  ],
}
