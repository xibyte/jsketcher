import {assertEmpty, assertEquals, assertFaceIsPlane, assertTrue} from '../utils/asserts';
import sketchObjectGlobalId from '../../app/cad/sketch/sketchObjectGlobalId';

export const TEST_MODE = 'modellerUI';

export function testExtrudeFromSketch2(env, ui) {
  // globalSketchId(sketchId, seg1.id)
}

export function testExtrudeFromSketch(env, ui) {
  ui.openWizard('PLANE');
  ui.wizardOK();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  let sketchedFace = ui.context.services.selection.face.single;
  let sketcherUI = ui.openSketcher();
  let seg1 = sketcherUI.addSegment(-100, -100, 100, -100);
  let seg2 = sketcherUI.addSegment(100, -100, 100, 100);
  let seg3 = sketcherUI.addSegment(100, 100, -100, 100);
  let seg4 = sketcherUI.addSegment(-100, 100, -100, -100);
  
  ui.commitSketch();
  
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  
  
  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();
  
  let [leftFace] = ui.rayCastFaces([-200, 0, 100], [200, 0, 100]);

  let sketchId = sketchedFace.defaultSketchId;

  assertTrue(leftFace.brepFace.data.productionInfo.originatedFromPrimitive, 
             sketchObjectGlobalId(sketchId, seg3.id));
  
  assertTrue(leftFace.brepFace.data.productionInfo.role, "sweep");

  env.done();
}
