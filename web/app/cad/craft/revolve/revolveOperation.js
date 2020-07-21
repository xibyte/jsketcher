import RevolveForm from './RevolveForm';
import schema from './schema';
import {revolvePreviewGeomProvider} from './revolvePreviewer';

export default {
  id: 'REVOLVE',
  label: 'Revolve',
  icon: 'img/cad/revolve',
  info: 'creates a solid based on revolve surfaces',
  paramsInfo: ({angle}) => angle,
  previewGeomProvider: revolvePreviewGeomProvider,
  run: (request, ctx) => ctx.craftEngine.revolve(request),
  form: RevolveForm,
  schema
};


