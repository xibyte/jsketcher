import RevolveForm from './RevolveForm';
import schema from './schema';
import {createRevolvePreviewGeomProvider, revolvePreviewGeomProvider} from './revolvePreviewer';
import {NOOP} from 'gems/func';

export default {
  id: 'REVOLVE',
  label: 'Revolve',
  icon: 'img/cad/revolve',
  info: 'creates a solid based on revolve surfaces',
  paramsInfo: ({angle}) => angle,
  previewGeomProvider: revolvePreviewGeomProvider,
  run: NOOP,
  form: RevolveForm,
  schema
};


