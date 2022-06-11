import {assertFaceOrigination, assertFaceRole} from '../utils/asserts';
import {createPlaneAndOpenSketcher} from '../utils/scripts';

export const TEST_MODE = 'modellerUI';

export async function testExtrudeFromSketch(env, ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);

  let seg1 = sketcherUI.addSegment(-100, -100, 100, -100);
  let seg2 = sketcherUI.addSegment(100, -100, 100, 100);
  let seg3 = sketcherUI.addSegment(100, 100, -100, 100);
  let seg4 = sketcherUI.addSegment(-100, 100, -100, -100);
  
  ui.commitSketch();
  
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  
  
  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();

  let [leftFace] = ui.rayCastFaces([-110, 0, 100], [-90, 0, 100]);
  let [rightFace] = ui.rayCastFaces([110, 0, 100], [90, 0, 100]);

  let [topFace] = ui.rayCastFaces([0, 110, 100], [0, 90, 100]);
  let [bottomFace] = ui.rayCastFaces([0, -110, 100], [0, -90, 100]);

  let [frontFace] = ui.rayCastFaces([0, 0, 210], [0, 0, 190]);
  let [backFace] = ui.rayCastFaces([0, 0, -10], [0, 0, 10]);


  assertFaceRole(leftFace, "sweep");
  assertFaceRole(rightFace, "sweep");
  assertFaceRole(topFace, "sweep");
  assertFaceRole(bottomFace, "sweep");
  assertFaceRole(frontFace, "lid");
  assertFaceRole(backFace, "base");

  let sketchId = sketchedFace.defaultSketchId;

  assertFaceOrigination(bottomFace, sketchId, seg1.id);
  assertFaceOrigination(rightFace, sketchId, seg2.id);
  assertFaceOrigination(topFace, sketchId, seg3.id);
  assertFaceOrigination(leftFace, sketchId, seg4.id);


}

export async function testExtrudeArc(env, ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  let arc = sketcherUI.addArc(0, 0, 100, 0, -100, 0);
  let segment = sketcherUI.addSegment(100, 0, -100, 0);

  // let gauge = ui.prismSurfaceGauge([-100, -100, 0], [100, -100, 0], [50, 50, 0], [-50, 50, 0] );
  //
  // ui.__DEBUG__.AddParametricSurface(gauge.surface);

  ui.commitSketch();

  ui.selectFaces([0, 0, -10], [0, 0, 10]);

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);
  
  await ui.wizardOK();

  let [curvedFace] = ui.rayCastFaces([0, 110, 100], [0, 90, 100]);
  let [flatFace] = ui.rayCastFaces([0, -10, 100], [0, 10, 100]);
  let [topFace] = ui.rayCastFaces([0, 50, 210], [0, 50, 190]);
  let [bottomFace] = ui.rayCastFaces([0, 50, -10], [0, 50, 10]);


  assertFaceRole(curvedFace, "sweep");
  assertFaceRole(flatFace, "sweep");
  assertFaceRole(topFace, "lid");
  assertFaceRole(bottomFace, "base");

  let sketchId = sketchedFace.defaultSketchId;

  assertFaceOrigination(curvedFace, sketchId, arc.id);
  assertFaceOrigination(flatFace, sketchId, segment.id);


}

export async function testExtrudeCircle(env, ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  let circle = sketcherUI.addCircle(100, 100, 100);

  ui.commitSketch();

  ui.selectFaces([0, 0, -10], [0, 0, 10]);

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);

  await ui.wizardOK();

  let [curvedFace] = ui.rayCastFaces([100, -10, 100], [100, 10, 100]);
  let [topFace] = ui.rayCastFaces([100, 100, 210], [100, 100, 190]);
  let [bottomFace] = ui.rayCastFaces([100, 100, -10], [100, 100, 10]);


  assertFaceRole(curvedFace, "sweep");
  assertFaceRole(topFace, "lid");
  assertFaceRole(bottomFace, "base");

  let sketchId = sketchedFace.defaultSketchId;

  assertFaceOrigination(curvedFace, sketchId, circle.id);


}

export async function testExtrudeEllipse(env, ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  let ellipse = sketcherUI.addEllipse(-100, 100, 100, 100, 0, 150);

  ui.commitSketch();

  ui.selectFaces([0, 0, -10], [0, 0, 10]);

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);

  await ui.wizardOK();

  let [curvedFace] = ui.rayCastFaces([0, 151, 100], [0, 149, 100]);
  let [topFace] = ui.rayCastFaces([0, 100, 201],[0, 100, 199]);
  let [bottomFace] = ui.rayCastFaces([0, 100, -1],[0, 100, 1]);

  
  assertFaceRole(curvedFace, "sweep");
  assertFaceRole(topFace, "lid");
  assertFaceRole(bottomFace, "base");

  let sketchId = sketchedFace.defaultSketchId;

  assertFaceOrigination(curvedFace, sketchId, ellipse.id);


}

export async function testExtrudeEllipticalArc(env, ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  let eArc = sketcherUI.addEllipticalArc(-100, 100, 100, 100, 0, 150);
  sketcherUI.move(100, 100, -50, 170);
  sketcherUI.addSegment(eArc.a.x, eArc.a.y, eArc.b.x, eArc.b.y);
  
  ui.commitSketch();

  ui.selectFaces([0, 0, -10], [0, 0, 10]);

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);

  await ui.wizardOK();

  let [curvedFace] = ui.rayCastFaces([-110, 100, 100], [-90, 100, 100]);
  let [topFace] = ui.rayCastFaces([0, 100, 201],[0, 100, 199]);
  let [bottomFace] = ui.rayCastFaces([0, 100, -1],[0, 100, 1]);


  assertFaceRole(curvedFace, "sweep");
  assertFaceRole(topFace, "lid");
  assertFaceRole(bottomFace, "base");

  let sketchId = sketchedFace.defaultSketchId;

  assertFaceOrigination(curvedFace, sketchId, eArc.id);


}

export async function testExtrudeBezier(env, ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  let bezier = sketcherUI.addBezier(-100, 100, 100, 100, 0, 150);
  sketcherUI.move(bezier.cp2.x, bezier.cp2.y, bezier.cp2.x, bezier.cp1.y);

  sketcherUI.addSegment(bezier.a.x, bezier.a.y, 0, 0);
  sketcherUI.addSegment(bezier.b.x, bezier.b.y, 0, 0);

  ui.commitSketch();

  ui.selectFaces([0, 0, -10], [0, 0, 10]);

  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);

  await ui.wizardOK();

  let [curvedFace] = ui.rayCastFaces([0, 178, 50], [0, 170, 50]);
  let [topFace] = ui.rayCastFaces([0, 100, 201],[0, 100, 199]);
  let [bottomFace] = ui.rayCastFaces([0, 100, -1],[0, 100, 1]);


  assertFaceRole(curvedFace, "sweep");
  assertFaceRole(topFace, "lid");
  assertFaceRole(bottomFace, "base");

  let sketchId = sketchedFace.defaultSketchId;

  assertFaceOrigination(curvedFace, sketchId, bezier.id);


}
