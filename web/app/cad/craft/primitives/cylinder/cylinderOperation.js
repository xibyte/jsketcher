import {CylinderGeometry} from 'three';
import schema from './cylinderOpSchema';
import primitivePreviewer from '../primitivePreviewer';
import CylinderWizard from './CylinderWizard';
import datumConsumingOperation from '../datumConsumingOperation';
import {assignBooleanParams} from '../booleanOptionHelper';

function run(params, services) {
  return datumConsumingOperation(params, services, csys => services.craftEngine.createCylinder(
    assignBooleanParams({
      csys,
      radius: params.radius,
      height: params.height
    }, params, services.cadRegistry.getAllShells)
  ));
}

export default {
  id: 'CYLINDER',
  label: 'Cylinder',
  icon: 'img/cad/cylinder',
  info: 'creates new cylinder',
  paramsInfo: ({radius, height}) => `(${radius}, ${height})`,
  previewer: primitivePreviewer(() => new CylinderGeometry(1, 1, 1, 50, 1), 
    ({radius: dx, height: dy, radius:dz}) => ({dx, dy, dz}), [0, 0.5, 0]),
  form: CylinderWizard,
  schema,
  run
};

