import {roundValueForPresentation as r} from '../operationHelper';
import {createPreviewGeomProvider} from './previewer';
import {Extrude} from './cutExtrude';
import {requiresFaceSelection} from '../../actions/actionHelpers';
import form from './form';
import schema from './schema';

export default {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo:  ({value}) => `(${r(value)})`,
  onParamsUpdate,
  previewGeomProvider: createPreviewGeomProvider(false),
  run: Extrude,
  actionParams: {
    ...requiresFaceSelection(1)
  },
  form: form('height'),
  schema
};

const INVARIANT = ['datumAxisVector', 'edgeVector', 'sketchSegmentVector'];

export function onParamsUpdate(params, name, value) {
  if (INVARIANT.includes(name)) {
    INVARIANT.forEach(param => {
      if (param !== name) {
        delete params[param];
      }
    })
  }
}