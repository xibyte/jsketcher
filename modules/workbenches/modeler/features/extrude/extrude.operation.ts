import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {MFace} from "cad/model/mface";
import {ApplicationContext} from "context";

interface ExtrudeParams {
  length: number;
  face: MFace;
}

export default {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo: ({value}) => `(${r(value)})`,
  mutualExclusiveFields: ['datumAxisVector', 'edgeVector', 'sketchSegmentVector'],
  run: (params: ExtrudeParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    const face = ctx.cadRegistry.findFace(params.face);

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
  schema: {
    length: {
      type: 'number',
      defaultValue: 50,
      label: 'length'
    },

    face: {
      type: 'face',
      initializeBySelection: 0
    },

    direction: {
      type: 'direction',
      optional: true
    },

    datumAxisVector: {
      type: 'datumAxis',
      optional: true,
      label: 'datum axis'
    },
    edgeVector: {
      type: 'edge',
      optional: true,
      label: 'edge',
      accept: edge => edge.brepEdge.curve.degree === 1
    },
    sketchSegmentVector: {
      type: 'sketchObject',
      optional: true,
      label: 'sketch segment',
      accept: obj => obj.isSegment
    },
    flip: {
      type: 'boolean',
      defaultValue: false,
    }

  }
}
