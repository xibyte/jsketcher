import {createPlaneAndOpenSketcher, extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export async function testLoftOver2Sections(env, ui) {
  let [sui, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  await ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addPolygon([0, -100], [100, 100], [-100, 100]);
  ui.commitSketch();

  ui.openWizard('LOFT');
  ui.select([0, 0, 310], [0, 0, 290]);
  ui.select([0, 0, -10], [0, 0, 10]);
  await ui.wizardOK();

}

export async function testLoftOver3Sections(env, ui) {
  let [sui, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  await ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addPolygon([0, -100], [100, 100], [-100, 100]);
  ui.commitSketch();


  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 600);
  await ui.wizardOK();
  ui.selectFaces([0, 0, 590], [0, 0, 610]);
  sui = ui.openSketcher();
  sui.addPolygon([0, 100], [100, -100], [-100, -100]);
  ui.commitSketch();


  ui.openWizard('LOFT');
  ui.select([0, 0, 610], [0, 0, 590]);
  ui.select([0, 0, 310], [0, 0, 290]);
  ui.select([0, 0, -10], [0, 0, 10]);
  await ui.wizardOK();

}


export async function testLoftCircleSections(env, ui) {
  let [sui, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  await ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addCircle(0, 0, 100);
  ui.commitSketch();
  
  ui.openWizard('LOFT');
  ui.select([0, 0, 310], [0, 0, 290]);
  ui.select([0, 0, -10], [0, 0, 10]);
  await ui.wizardOK();

}



