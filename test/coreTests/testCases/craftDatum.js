import {assertEquals, assertTrue} from '../utils/asserts';
import {DATUM} from '../../../web/app/cad/scene/entites';

export const TEST_MODE = 'modellerUI';

export async function testCreateDatumOrigin(env, ui) {
  ui.openWizard('DATUM_CREATE');
  await ui.wizardOK();
  
  let datum = ui.context.services.cadRegistry.models[0];
  ui.context.services.pickControl.pick(datum);

  ui.openWizard('PLANE_FROM_DATUM');
  assertEquals(datum.id, ui.wizardContext.workingRequest$.value.params.datum);
  await ui.wizardOK();
  
  let [placeFace] = ui.rayCastFaces([10, 10, -10], [10, 10, 10]);
  assertTrue(placeFace !== undefined);

  
}

export async function testCreateMovedDatum(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  await ui.wizardOK();

  let datum = ui.context.services.cadRegistry.models[0];
  ui.context.services.pickControl.pick(datum);

  ui.openWizard('PLANE_FROM_DATUM');
  assertEquals(datum.id, ui.wizardContext.workingRequest$.value.params.datum);
  await ui.wizardOK();

  ui.select([10, 10, -10], [10, 10, 10]);
  assertTrue(ui.context.services.selection.face.single === undefined);

  ui.select([110, 110, 90], [110, 110, 110]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  
}

export async function testCreateDatumOffFace(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  await ui.wizardOK();

  let datum = ui.context.services.cadRegistry.models[0];
  ui.context.services.pickControl.pick(datum);

  ui.openWizard('PLANE_FROM_DATUM');
  await ui.wizardOK();

  ui.select([110, 110, 90], [110, 110, 110]);
  
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  await ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('PLANE_FROM_DATUM');
  await ui.wizardOK();

  ui.select([210, 210, 190], [210, 210, 210]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  
}


export async function testRotateDatum(env, ui) {
  ui.openWizard('DATUM_CREATE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  await ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('DATUM_ROTATE');
  ui.wizardContext.updateParam('axis', 'Z');
  ui.wizardContext.updateParam('angle', 180);
  await ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('PLANE_FROM_DATUM');
  await ui.wizardOK();

  ui.select([90, 90, 90], [90, 90, 110]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  
}

export async function testMoveDatum(env, ui) {
  ui.openWizard('DATUM_CREATE');
  await ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('DATUM_MOVE');
  ui.wizardContext.updateParam("x", 100);
  ui.wizardContext.updateParam("y", 100);
  ui.wizardContext.updateParam("z", 100);
  await ui.wizardOK();

  ui.selectFirst(DATUM);
  ui.openWizard('PLANE_FROM_DATUM');
  await ui.wizardOK();

  ui.select([110, 110, 90], [110, 110, 110]);
  assertTrue(ui.context.services.selection.face.single !== undefined);

  
}