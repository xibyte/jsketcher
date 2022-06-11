import {extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';
export const only = true;

export async function testCutMid(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-50, -50, 50, 50);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('height', 50);
  await ui.wizardOK();

  
}

export async function testCutCOI1Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 80, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('height', 50);
  await ui.wizardOK();

  
}

export async function testCutCOI2Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();

  
}

export async function testCutCOI3Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();

  
}

export async function testCutCOI4Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();

  
}

// all the way cuts

export async function testCutMidAllWay(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-50, -50, 50, 50);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();

  
}

export async function testCutCOI1FacesAllWay(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 80, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();

  
}

export async function testCutCOI2FacesAllWay(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();

  
}

export async function testCutCOI3FacesAllWay(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();

  
}
testCutCOI3FacesAllWay.only = true

export async function testCutCOI4FacesAllWay(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('CUT');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();

  
}

