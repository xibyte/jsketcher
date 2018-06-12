import {roundValueForPresentation as r} from '../operationHelper';
import {createPrismWizard, createWizardMetadata} from './wizardMetadata';
import {createPreviewGeomProvider} from './previewer';
import {Extrude} from './cutExtrude';
import {requiresFaceSelection} from '../../actions/actionHelpers';

export default {
  id: 'EXTRUDE',
  label: 'Extrude',
  icon: 'img/cad/extrude',
  info: 'extrudes 2D sketch',
  paramsInfo:  ({value}) => `(${r(value)})`,
  previewGeomProvider: createPreviewGeomProvider(false),
  run: Extrude,
  actionParams: {
    ...requiresFaceSelection(1)
  },
  wizard: createPrismWizard('height')
};

