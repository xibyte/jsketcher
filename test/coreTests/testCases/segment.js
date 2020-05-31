import Vector from 'math/vector';
import {assertEquals, assertPoint2DEquals} from "../utils/asserts";
import {createSketcherTPI} from "../subjects/sketcherTPI";

export const TEST_MODE = 'sketcherUI';

export async function testSegmentWizard(env, tpi) {
  assertEquals(0, tpi.viewer.activeLayer.objects.length);
  tpi.addSegment(10, 10, 100, 100);

  assertEquals(1, tpi.viewer.activeLayer.objects.length);
  const segment = tpi.viewer.activeLayer.objects[0];
  assertEquals('Segment', segment.TYPE);
  const [asx, asy] = tpi.toScreen(10, 10);
  const [bsx, bsy] = tpi.toScreen(100, 100);
  assertPoint2DEquals(tpi.toModel(asx, asy), segment.a);
  assertPoint2DEquals(tpi.toModel(bsx, bsy), segment.b);

}

export async function testSaveLoad(env, tpi) {
  assertEquals(0, tpi.viewer.activeLayer.objects.length);
  tpi.addSegment(10, 10, 100, 100);
  tpi.runAction('Save');
  cy.visit('http://localhost:3000');
  cy.window().then(win => {

  });
  // env.navigate('http://google.com').then(win => {
  //   const tpi = createSketcherTPI(win.__CAD_APP);
  //   assertEquals(1, tpi.viewer.activeLayer.objects.length);
  //   const segment = tpi.viewer.activeLayer.objects[0];
  //   assertEquals('TCAD.TWO.Segment', segment._class);
  //
  // });

}
testSaveLoad.only = true;
//
// testSelection: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     sketcher_utils.addSegment(app, 10, 10, 100, 100);
//     env.assertEquals(0, app.viewer.selected.length);
//     sketcher_utils.clickXY(app, 50, 50);
//     env.assertEquals(1, app.viewer.selected.length);
//
//   }));
// },
//
// testSelectionNeighborhood: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     sketcher_utils.addSegment(app, 10, 10, 100, 100);
//     env.assertEquals(0, app.viewer.selected.length);
//     // this point technically isn't on the line but should trigger the selection
//     sketcher_utils.clickXY(app, 55, 50);
//     env.assertEquals(1, app.viewer.selected.length);
//     env.assertEquals('TCAD.TWO.Segment', app.viewer.selected[0]._class);
//
//   }));
// },
//
// testRemove: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     const segment = sketcher_utils.addSegment(app, 10, 10, 100, 100);
//     env.assertEquals(1, app.viewer.activeLayer.objects.length);
//     sketcher_utils.clickXY(app, 50, 50);
//     const keyboardEvent = keyboard.keyCode('keydown', 8);
//     win.dispatchEvent(keyboardEvent);
//     env.assertEquals(0, app.viewer.activeLayer.objects.length);
//
//   }));
// },
//
// testSnapFirstPoint: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     const s1 = sketcher_utils.addSegment(app, 10, 10, 100, 100);
//     const s2 = sketcher_utils.addSegment(app, 102, 102, 50, 10);
//     const constraints = sketcher_utils.getConstraints(app);
//     env.assertEquals(1, constraints.length);
//     env.assertEquals('coi', constraints[0].NAME);
//     env.assertEquals(1, s1.b.linked.length);
//     env.assertEquals(1, s2.a.linked.length);
//     env.assertEquals(s1.b.linked[0], s2.a);
//     env.assertEquals(s2.a.linked[0], s1.b);
//
//   }));
// },
//
// testSnapSecondPoint: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     const s1 = sketcher_utils.addSegment(app, 10, 10, 100, 100);
//     const s2 = sketcher_utils.addSegment(app, 50, 10, 102, 102);
//     const constraints = sketcher_utils.getConstraints(app);
//     env.assertEquals(1, constraints.length);
//     env.assertEquals('coi', constraints[0].NAME);
//     env.assertEquals(1, s1.b.linked.length);
//     env.assertEquals(1, s2.b.linked.length);
//     env.assertEquals(s1.b.linked[0], s2.b);
//     env.assertEquals(s2.b.linked[0], s1.b);
//
//   }));
// },
//
// testEndPointMove: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     const segment = sketcher_utils.addSegment(app, 10, 10, 100, 100);
//     sketcher_utils.move(app, vec(100, 100), vec(200, 150));
//     //should be still
//     env.assertPoint2DEquals(sketcher_utils.toModel(app, 10, 10), segment.a);
//     //should be moved
//     env.assertPoint2DEquals(sketcher_utils.toModel(app, 200, 150), segment.b);
//
//   }));
// },
//
// testLineMove: function(env) {
//   test.emptySketch(env.test((win, app) => {
//     const initA = vec(10, 10);
//     const initB = vec(100, 100);
//     const segment = sketcher_utils.addSegment(app, initA.x, initA.y, initB.x, initB.y);
//     const from = vec(50, 50);
//     const moveDelta = vec(100, 50);
//     sketcher_utils.move(app, from, from.plus(moveDelta));
//     env.assertPoint2DEquals(sketcher_utils.toModelP(app, initA.plus(moveDelta)), segment.a);
//     env.assertPoint2DEquals(sketcher_utils.toModelP(app, initB.plus(moveDelta)), segment.b);
//     env.assertEquals('TCAD.TWO.Segment', app.viewer.selected[0]._class);
//
//   }));
// }



function vec(x, y, z) {
  return new Vector(x, y, z);
}
