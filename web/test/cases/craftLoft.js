import {createPlaneAndOpenSketcher, extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export function testLoftOver2Sections(env, ui) {
  let sui = createPlaneAndOpenSketcher(ui);
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addPolygon([0, -100], [100, 100], [-100, 100]);
  ui.commitSketch();

  ui.openWizard('LOFT');
  ui.select([-3, -3, 310], [-3, -3, 290]);
  ui.select([-3, -3, -10], [-3, -3, 10]);
  ui.wizardOK();
  env.done();
}

export function testLoftOver3Sections(env, ui) {
  let sui = createPlaneAndOpenSketcher(ui);
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addPolygon([0, -100], [100, 100], [-100, 100]);
  ui.commitSketch();


  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 600);
  ui.wizardOK();
  ui.selectFaces([0, 0, 590], [0, 0, 610]);
  sui = ui.openSketcher();
  sui.addPolygon([0, 100], [100, -100], [-100, -100]);
  ui.commitSketch();


  ui.openWizard('LOFT');
  ui.select([-3, -3, 610], [-3, -3, 590]);
  ui.select([-3, -3, 310], [-3, -3, 290]);
  ui.select([-3, -3, -10], [-3, -3, 10]);
  ui.wizardOK();
  env.done();
}


export function testLoftCircleSections(env, ui) {
  let sui = createPlaneAndOpenSketcher(ui);
  sui.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addCircle(0, 0, 100);
  ui.commitSketch();
  
  ui.openWizard('LOFT');
  ui.select([-3, -3, 310], [-3, -3, 290]);
  ui.select([-3, -3, -10], [-3, -3, 10]);
  ui.wizardOK();
  env.done();
}



