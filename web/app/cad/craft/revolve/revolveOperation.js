import RevolveForm from './RevolveForm';
import schema from './schema';

export default {
  id: 'REVOLVE',
  label: 'Revolve',
  icon: 'img/cad/revolve',
  info: 'creates a solid based on revolve surfaces',
  paramsInfo: ({angle}) => angle,
  previewGeomProvider: () => new THREE.Geometry(),
  run: (request) => console.dir(request),
  form: RevolveForm,
  schema
};


