import {SphereGeometry} from 'three';
import schema from './sphereOpSchema';
import primitivePreviewer from '../primitivePreviewer';
import SphereWizard from './SphereWizard';
import datumConsumingOperation from '../datumConsumingOperation';
import {assignBooleanParams} from '../booleanOptionHelper';

function run(params, services) {
  return datumConsumingOperation(params, services, csys => services.craftEngine.createSphere(
    assignBooleanParams({
      csys,
      radius: params.radius,
    }, params, services.cadRegistry.getAllShells)
  ));
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

