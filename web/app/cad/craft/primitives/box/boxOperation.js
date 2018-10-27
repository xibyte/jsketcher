import BoxWizard from './BoxWizard';
import {BoxGeometry} from 'three';
import schema from './boxOpSchema';
import primitivePreviewer from '../primitivePreviewer';
import CSys from '../../../../math/csys';
import datumConsumingOperation from '../datumConsumingOperation';

function run(params, services) {
  return datumConsumingOperation(params, services, csys => services.craftEngine.createBox({
    csys,
    width: params.width,
    height: params.height,
    depth: params.depth
  }));
}

export default {
  id: 'BOX',
  label: 'Box',
  icon: 'img/cad/cube',
  info: 'creates new object box',
  paramsInfo: ({width, height, depth}) => `(${width}, ${height}, ${depth})`,
  previewer: primitivePreviewer(() => new BoxGeometry(), 
    ({width: dx, height: dy, depth: dz}) => ({dx, dy, dz}), [0.5, 0.5, 0.5]),
  form: BoxWizard,
  schema,
  run
};

