import {roundValueForPresentation as r} from '../operationHelper';
import {createPrismWizard, createWizardMetadata} from './wizardMetadata';
import {createPreviewGeomProvider} from './previewer';
import {Cut} from './cutExtrude';
import {requiresFaceSelection} from '../../actions/actionHelpers';

export default {
  id: 'CUT',
  label: 'Cut',
  icon: 'img/cad/cut',
  info: 'makes a cut based on 2D sketch',
  paramsInfo:  ({value}) => `(${r(value)})`,
  previewGeomProvider: createPreviewGeomProvider(true),
  run: Cut,
  actionParams: {
    ...requiresFaceSelection(1)
  },
  wizard: createPrismWizard('depth')
};
