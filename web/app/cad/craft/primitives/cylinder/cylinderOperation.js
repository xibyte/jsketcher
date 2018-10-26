import {CylinderGeometry} from 'three';
import schema from './cylinderOpSchema';
import primitivePreviewer from '../primitivePreviewer';
import CylinderWizard from './CylinderWizard';

function run(params, services) {
  let mDatum = params.datum && services.cadRegistry.findDatum(params.datum);

  return {
    outdated: mDatum ? [mDatum] : [],
    created: []
  }
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

