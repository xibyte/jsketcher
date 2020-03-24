import {extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export function testExtrudeMid(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-50, -50, 50, 50);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testExtrudeCOI1Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 80, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testExtrudeCOI2Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 100, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testExtrudeCOI3Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testExtrudeCOI4Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}
