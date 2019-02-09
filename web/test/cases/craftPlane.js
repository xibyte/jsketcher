import {assertEmpty, assertEquals, assertFaceIsPlane, assertTrue} from '../utils/asserts';

export const TEST_MODE = 'modellerUI';

export function testCreatePlaneAtOriginDefaultXY(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardOK();
  assertFaceIsPlane(ui.rayCastFaces([0, 0, -10], [0, 0, 10])[0]);
  env.done();
}

export function testCreatePlaneAtOriginXZ(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('orientation', 'XZ');
  ui.wizardOK();
  assertFaceIsPlane(ui.rayCastFaces([0, -10, 0], [0, 10, 0])[0]);
  env.done();
}

export function testCreatePlaneAtZY(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('orientation', 'ZY');
  ui.wizardOK();
  assertFaceIsPlane(ui.rayCastFaces([-10, 0, 0], [10, 0, 0])[0]);
  env.done();
}

export function testCreatePlaneAtOriginXYOffset(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('depth', 100);
  ui.wizardOK();
  assertEmpty(ui.rayCastFaces([0, 0, -10], [0, 0, 10]));
  assertFaceIsPlane(ui.rayCastFaces([0, 0, 90], [0, 0, 110])[0]);
  env.done();
}

export function testCreatePlaneAtOriginXZOffset(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('orientation', 'XZ');
  ui.wizardContext.updateParam('depth', 100);
  ui.wizardOK();
  assertEmpty(ui.rayCastFaces([0, -10, 0], [0, 10, 0]));
  assertFaceIsPlane(ui.rayCastFaces([0, 90, 0], [0, 110, 0])[0]);
  env.done();
}

export function testCreatePlaneAtOriginZYOffset(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('orientation', 'ZY');
  ui.wizardContext.updateParam('depth', 100);
  ui.wizardOK();
  assertEmpty(ui.rayCastFaces([-10, 0, 0], [10, 0, 0]));
  assertFaceIsPlane(ui.rayCastFaces([90, 0, 0], [110, 0, 0])[0]);
  env.done();
}

export function testCreatePlaneParallelToOther(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('orientation', 'ZY');
  ui.wizardContext.updateParam('depth', 100);
  ui.wizardOK();
  
  assertEmpty(ui.rayCastFaces([-10, 0, 0], [10, 0, 0]));
  let captured = ui.rayCastFaces([90, 0, 0], [210, 0, 0]);
  assertTrue(captured.length === 1);
  
  let baseFace = captured[0];
  
  ui.openWizard('PLANE');
  ui.wizardContext.updateParam('parallelTo', baseFace.id);
  ui.wizardContext.updateParam('depth', 100);
  ui.wizardOK();
  
  captured = ui.rayCastFaces([90, 0, 0], [210, 0, 0]);
  assertTrue(captured.length === 2);
  assertTrue(captured[0].id === baseFace.id);
  assertTrue(captured[1].id !== baseFace.id);
  
  env.done();
}

