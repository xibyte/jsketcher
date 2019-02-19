import {createPlaneAndOpenSketcher, extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export function test1Fillet(env, ui) {
  extrudeCube(ui);
  ui.openWizard('FILLET');
  ui.select([0, 110, 210], [0, 90, 190]);
  ui.wizardOK();
  env.done();
}

export function test2Fillet(env, ui) {
  extrudeCube(ui);
  ui.openWizard('FILLET');
  ui.select([0, 110, 210], [0, 90, 190]);
  ui.select([-110, 110, 100], [-90, 90, 100]);
  ui.wizardOK();
  env.done();
}

export function test3Fillet(env, ui) {
  extrudeCube(ui);
  ui.openWizard('FILLET');
  ui.select([0, 110, 210], [0, 90, 190]);
  ui.select([-110, 110, 100], [-90, 90, 100]);
  ui.select([-110, 0, 210], [-90, 0, 190]);
  ui.wizardOK();
  env.done();
}


