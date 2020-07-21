import FilletForm from './FilletForm';
import schema from './schema';

export default {
  id: 'FILLET',
  label: 'Fillet',
  icon: 'img/cad/fillet',
  info: 'creates a fillet on selected edges',
  paramsInfo: ({edges}) => edges.map(o => o.thikness).join(' ,'),
  previewGeomProvider: () => new THREE.Geometry(),
  run: (request, ctx) => ctx.craftEngine.fillet(request),
  form: FilletForm,
  schema
};

