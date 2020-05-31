import {createPlaneAndOpenSketcher, extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export async function test1Fillet(env, ui) {
  await extrudeCube(ui);
  ui.openWizard('FILLET');
  ui.select([0, 110, 210], [0, 90, 190]);
  await ui.wizardOK();

}

export async function test2Fillet(env, ui) {
  await extrudeCube(ui);
  ui.openWizard('FILLET');
  ui.select([0, 110, 210], [0, 90, 190]);
  ui.select([-110, 110, 100], [-90, 90, 100]);
  await ui.wizardOK();

}

export async function test3Fillet(env, ui) {
  await extrudeCube(ui);
  ui.openWizard('FILLET');
  ui.select([0, 110, 210], [0, 90, 190]);
  ui.select([-110, 110, 100], [-90, 90, 100]);
  ui.select([-110, 0, 210], [-90, 0, 190]);
  await ui.wizardOK();

}


