import {extrudeCube} from '../utils/scripts';
import {assertEquals} from '../utils/asserts';
import {testExtrudeBezier} from "./craftExtrudeBasicShapes";

export const TEST_MODE = 'modellerUI';

export async function testExtrudeMid(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-50, -50, 50, 50);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();
}

export async function testExtrudeCOI1Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 80, 100);
  ui.commitSketch();
  // Finishing a sketch clears the selection; select its face for extrusion.
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();
  assertEquals(3, ui.context.craftService.modifications$.value.history.length);
  assertEquals(2, ui.context.services.cadRegistry.models.length);

  
}

export async function testExtrudeCOI2Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, 0, 100, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();

  
}

export async function testExtrudeCOI3Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(0, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();

  
}

export async function testExtrudeCOI4Faces(env, ui) {
  await extrudeCube(ui);
  ui.selectFaces([0, 0, 210], [0, 0, 190]);

  let sui = ui.openSketcher();
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 50);
  await ui.wizardOK();

  
}
