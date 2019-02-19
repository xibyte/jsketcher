import {createPlaneAndOpenSketcher, extrudeCube} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export function testLoftOver2Sections(env, ui) {
  let sui = createPlaneAndOpenSketcher(ui);
  sui.addPolygon(-100, -100, 100, 100);
  ui.commitSketch();

  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 300);
  ui.wizardOK();
  ui.selectFaces([0, 0, 290], [0, 0, 310]);
  sui = ui.openSketcher();
  sui.addSerpinski([-100, 0], [100, 0], 2);
  ui.commitSketch();

  ui.openWizard('LOFT');
  ui.select([-3, -3, 310], [-3, -3, 290]);
  ui.select([-3, -3, -10], [-3, -3, 10]);
  ui.wizardOK();
  env.done();
}



