import {roundValueForPresentation as r} from '../operationHelper';
import form from './form';
import {createPreviewGeomProvider} from './previewer';
import {Cut} from './cutExtrude';
import {requiresFaceSelection} from '../../actions/actionHelpers';
import schema from './schema';
import {onParamsUpdate} from './extrudeOperation';

export default {
  id: 'CUT',
  label: 'Cut',
  icon: 'img/cad/cut',
  info: 'makes a cut based on 2D sketch',
  paramsInfo:  ({value}) => `(${r(value)})`,
  onParamsUpdate, 
  previewGeomProvider: createPreviewGeomProvider(true),
  run: Cut,
  actionParams: {
    ...requiresFaceSelection(1)
  },
  form: form('depth'),
  schema
};
