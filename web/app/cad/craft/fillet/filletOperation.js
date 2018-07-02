import FilletForm from './FilletForm';
import schema from './schema';

export default {
  id: 'FILLET',
  label: 'Fillet',
  icon: 'img/cad/intersection',
  info: 'creates a fillet on selected edges',
  paramsInfo: ({edges}) => edges.map(o => o.thikness).join(' ,'),
  previewGeomProvider: () => new THREE.Geometry(),
  run: (request) => console.dir(request),
  form: FilletForm,
  schema
};

