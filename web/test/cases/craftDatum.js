import {assertEquals, assertTrue} from '../utils/asserts';
import {DATUM} from '../../app/cad/scene/entites';

export const TEST_MODE = 'modellerUI';

export function testCreateDatumOrigin(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardOK();
  
  let datum = ui.context.services.cadRegistry.models[0];
  ui.context.services.pickControl.pick(datum);

  ui.openWizard('PLANE_FROM_DATUM');
  assertEquals(datum.id, ui.wizardContext.workingRequest$.value.params.datum);
  ui.wizardOK();
  
  let [placeFace] = ui.rayCastFaces([10, 10, -10], [10, 10, 10]);
  assertTrue(placeFace !== undefined);

  env.done();
}

export function testCreateMovedDatum(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  ui.wizardOK();

  let datum = ui.context.services.cadRegistry.models[0];
  ui.context.services.pickControl.pick(datum);

  ui.openWizard('PLANE_FROM_DATUM');
  assertEquals(datum.id, ui.wizardContext.workingRequest$.value.params.datum);
  ui.wizardOK();

  ui.select([10, 10, -10], [10, 10, 10]);
  assertTrue(ui.context.services.selection.face.single === undefined);

  ui.select([110, 110, 90], [110, 110, 110]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  env.done();
}

export function testCreateDatumOffFace(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  ui.wizardOK();

  let datum = ui.context.services.cadRegistry.models[0];
  ui.context.services.pickControl.pick(datum);

  ui.openWizard('PLANE_FROM_DATUM');
  ui.wizardOK();

  ui.select([110, 110, 90], [110, 110, 110]);
  
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('PLANE_FROM_DATUM');
  ui.wizardOK();

  ui.select([210, 210, 190], [210, 210, 210]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  env.done();
}


export function testRotateDatum(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('DATUM_ROTATE');
  ui.wizardContext.updateParam('axis', 'Z');
  ui.wizardContext.updateParam('angle', 180);
  ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('PLANE_FROM_DATUM');
  ui.wizardOK();

  ui.select([90, 90, 90], [90, 90, 110]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  env.done();
}

export function testMoveDatum(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('DATUM_MOVE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('PLANE_FROM_DATUM');
  ui.wizardOK();

  ui.select([110, 110, 90], [110, 110, 110]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  env.done();
}