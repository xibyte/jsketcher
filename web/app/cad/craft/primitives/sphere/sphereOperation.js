import {SphereGeometry} from 'three';
import schema from './sphereOpSchema';
import primitivePreviewer from '../primitivePreviewer';
import SphereWizard from './SphereWizard';
import datumConsumingOperation from '../datumConsumingOperation';

function run(params, services) {
  return datumConsumingOperation(params, services, csys => services.craftEngine.createSphere({
    csys,
    radius: params.radius,
  }));
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

