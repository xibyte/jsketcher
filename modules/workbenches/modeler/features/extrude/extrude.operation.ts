import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";
import {MDFCommand} from "cad/mdf/mdf";
import {EntityKind} from "cad/model/entities";

interface ExtrudeParams {
  length: number;
  face: MFace;
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

    const shapeNames = occ.utils.prism(occFaces, [0, 0, params.length]);

    const created = shapeNames.map(shapeName => occ.io.getShell(shapeName));

    return {
      consumed: [face.parent],
      created
    };

  },

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
  ],
}

export default ExtrudeOperation;