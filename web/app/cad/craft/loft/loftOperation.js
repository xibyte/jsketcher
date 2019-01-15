import schema from './schema';
import {loftPreviewGeomProvider} from './loftPreviewer';
import {assignBooleanParams} from '../primitives/booleanOptionHelper';
import LoftForm from './LoftForm';

export default {
  id: 'LOFT',
  label: 'Loft',
  icon: 'img/cad/revolve',
  info: 'creates a loft cross selected sections shape',
  paramsInfo: () => '',
  previewGeomProvider: loftPreviewGeomProvider,
  run: runLoft,
  form: LoftForm,
  schema
};


function runLoft(params, services) {
  
  services.craftEngine.loft(assignBooleanParams({
    sections: params.sections.map(services.cadRegistry.findLoop),
  }, params, services.cadRegistry.getAllShells));
}

