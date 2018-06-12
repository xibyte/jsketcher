import FilletWizard from './FilletWizard';

export default {
  id: 'FILLET',
  label: 'Fillet',
  icon: 'img/cad/intersection',
  info: 'creates a fillet on selected edges',
  paramsInfo: ({operands}) => operands.map(o => o.thikness).join(' ,'),
  previewGeomProvider: () => new THREE.Geometry(),
  run: (request) => console.dir(request),
  wizard: FilletWizard,
};


