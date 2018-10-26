import {SphereGeometry} from 'three';
import schema from './sphereOpSchema';
import primitivePreviewer from '../primitivePreviewer';
import SphereWizard from './SphereWizard';

function run(params, services) {
  let mDatum = params.datum && services.cadRegistry.findDatum(params.datum);

  return {
    outdated: mDatum ? [mDatum] : [],
    created: []
  }
}

export default {
  id: 'SPHERE',
  label: 'Sphere',
  icon: 'img/cad/sphere',
  info: 'creates new sphere',
  paramsInfo: ({radius}) => `(${radius})`,
  previewer: primitivePreviewer(() => new SphereGeometry(1, 50, 50), ({radius: dx, radius: dy, radius: dz}) => ({dx, dy, dz})),
  form: SphereWizard,
  schema,
  run
};

