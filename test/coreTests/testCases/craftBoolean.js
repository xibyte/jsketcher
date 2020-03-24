import {DATUM} from '../../../web/app/cad/scene/entites';
import {assertEquals, assertTrue} from '../utils/asserts';

export const TEST_MODE = 'modellerUI';


export function testBooleanUnion(env, ui) {
  ui.openWizard('BOX');
  ui.wizardOK();

  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam('x', 0);
  ui.wizardContext.updateParam('y', 500);
  ui.wizardContext.updateParam('z', 500);
  ui.wizardOK();

  ui.selectFirst(DATUM);

  ui.openWizard('SPHERE');
  ui.wizardOK();

  ui.openWizard('UNION');
  ui.select([-10, 250, 250], [10, 250, 250]);
  ui.select([-260, 500, 500], [-240, 500, 500]);
  ui.wizardOK();

  assertEquals(1, ui.context.services.cadRegistry.models.length);
  let [m1] = ui.rayCast([-10, 250, 250], [10, 250, 250]);
  let [m2] = ui.rayCast([-260, 500, 500], [-240, 500, 500]);
  assertEquals(m1.shell, m2.shell);
  env.done();
}


export function testBooleanIntersect(env, ui) {
  ui.openWizard('BOX');
  ui.wizardOK();

  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam('x', 0);
  ui.wizardContext.updateParam('y', 500);
  ui.wizardContext.updateParam('z', 500);
  ui.wizardOK();

  ui.selectFirst(DATUM);

  ui.openWizard('SPHERE');
  ui.wizardOK();

  ui.openWizard('INTERSECTION');
  ui.select([-10, 250, 250], [10, 250, 250]);
  ui.select([-260, 500, 500], [-240, 500, 500]);
  ui.wizardOK();

  assertEquals(1, ui.context.services.cadRegistry.models.length);
  let [m1] = ui.rayCast([-10, 250, 250], [10, 250, 250]);
  let [m2] = ui.rayCast([-260, 500, 500], [-240, 500, 500]);
  assertTrue(m1 === undefined);
  assertTrue(m2 === undefined);
  ui.select([-10, 450, 450], [10, 450, 450]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  env.done();
}

export function testBooleanSubtract(env, ui) {
  ui.openWizard('BOX');
  ui.wizardOK();

  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam('x', 0);
  ui.wizardContext.updateParam('y', 500);
  ui.wizardContext.updateParam('z', 500);
  ui.wizardOK();

  ui.selectFirst(DATUM);

  ui.openWizard('SPHERE');
  ui.wizardOK();

  ui.openWizard('SUBTRACT');
  ui.select([-10, 250, 250], [10, 250, 250]);
  ui.select([-260, 500, 500], [-240, 500, 500]);
  ui.wizardOK();

  assertEquals(1, ui.context.services.cadRegistry.models.length);
  let [m1] = ui.rayCast([-10, 250, 250], [10, 250, 250]);
  let [m2] = ui.rayCast([-260, 500, 500], [-240, 500, 500]);
  assertTrue(m1 !== undefined);
  assertTrue(m2 === undefined);
  env.done();
}