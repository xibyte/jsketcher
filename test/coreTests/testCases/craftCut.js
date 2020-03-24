import {extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export function testCutMid(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-50, -50, 50, 50);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testCutCOI1Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 80, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testCutCOI2Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 100, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testCutCOI3Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

export function testCutCOI4Faces(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 50);
  ui.wizardOK();

  env.done();
}

// all the way cuts

export function testCutMidAllWay(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-50, -50, 50, 50);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();

  env.done();
}

export function testCutCOI1FacesAllWay(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 80, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();

  env.done();
}

export function testCutCOI2FacesAllWay(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 100, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();

  env.done();
}

export function testCutCOI3FacesAllWay(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();

  env.done();
}

export function testCutCOI4FacesAllWay(env, ui) {
  extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();

  env.done();
}

