import * as test from '../test'
import * as sketcher_utils from '../utils/sketcher-utils'
import {TestMouseEvent} from '../utils/mouse-event'
import Vector from '../../app/math/vector';

function addSegment(app, aX, aY, bX, bY) {
  app.actions['addSegment'].action();
  const tool = app.viewer.toolManager.tool;
  tool.mousemove(new TestMouseEvent(aX, aY));
  tool.mouseup(new TestMouseEvent(aX, aY));
  tool.mousemove(new TestMouseEvent(bX, bY));
  const segment = tool.line;
  tool.mouseup(new TestMouseEvent(bX, bY));
  app.viewer.toolManager.releaseControl();
  return segment;
}

export default {
  testSegmentWizard: function(env) {
    test.emptySketch(env.test((win, app) => {
      env.assertEquals(0, app.viewer.activeLayer.objects.length);
      addSegment(app, 10, 10, 100, 100);  
      env.assertEquals(1, app.viewer.activeLayer.objects.length);
      const segment = app.viewer.activeLayer.objects[0];
      env.assertEquals('TCAD.TWO.Segment', segment._class);
      env.assertPoint2DEquals(sketcher_utils.toModel(app, 10, 10), segment.a);
      env.assertPoint2DEquals(sketcher_utils.toModel(app, 100, 100), segment.b);
      env.done();
    }));
  }, 
  
  testSaveLoad: function(env) {
    test.emptySketch(env.test((win, app) => {
      env.assertEquals(0, app.viewer.activeLayer.objects.length);
      addSegment(app, 10, 10, 100, 100);
      app.actions['save'].action();
      test.sketch(env.test((win, app) => {
        env.assertEquals(1, app.viewer.activeLayer.objects.length);
        const segment = app.viewer.activeLayer.objects[0];
        env.assertEquals('TCAD.TWO.Segment', segment._class);
        env.done();
      }));
    }));
  },
  
  testSelection: function(env) {
    test.emptySketch(env.test((win, app) => {
      addSegment(app, 10, 10, 100, 100);
      env.assertEquals(0, app.viewer.selected.length);
      sketcher_utils.click(app.viewer.toolManager.tool, 50, 50);
      env.assertEquals(1, app.viewer.selected.length);
      env.done();
    }));
  },
  
  testSelectionNeighborhood: function(env) {
    test.emptySketch(env.test((win, app) => {
      addSegment(app, 10, 10, 100, 100);
      env.assertEquals(0, app.viewer.selected.length);
      // this point technically isn't on the line but should trigger the selection
      sketcher_utils.click(app.viewer.toolManager.tool, 55, 50);
      env.assertEquals(1, app.viewer.selected.length);
      env.done();
    }));
  },

  testSnapFirstPoint: function(env) {
    test.emptySketch(env.test((win, app) => {
      const s1 = addSegment(app, 10, 10, 100, 100);
      const s2 = addSegment(app, 102, 102, 50, 10);
      const constraints = sketcher_utils.getConstraints(app);
      env.assertEquals(1, constraints.length);
      env.assertEquals('coi', constraints[0].NAME);
      env.assertEquals(1, s1.b.linked.length);
      env.assertEquals(1, s2.a.linked.length);
      env.assertEquals(s1.b.linked[0], s2.a);
      env.assertEquals(s2.a.linked[0], s1.b);
      env.done();
    }));
  },

  testSnapSecondPoint: function(env) {
    test.emptySketch(env.test((win, app) => {
      const s1 = addSegment(app, 10, 10, 100, 100);
      const s2 = addSegment(app, 50, 10, 102, 102);
      const constraints = sketcher_utils.getConstraints(app);
      env.assertEquals(1, constraints.length);
      env.assertEquals('coi', constraints[0].NAME);
      env.assertEquals(1, s1.b.linked.length);
      env.assertEquals(1, s2.b.linked.length);
      env.assertEquals(s1.b.linked[0], s2.b);
      env.assertEquals(s2.b.linked[0], s1.b);
      env.done();
    }));
  },

  testEndPointMove: function(env) {
    test.emptySketch(env.test((win, app) => {
      const segment = addSegment(app, 10, 10, 100, 100);
      sketcher_utils.move(app, vec(100, 100), vec(200, 150));
      //should be still
      env.assertPoint2DEquals(sketcher_utils.toModel(app, 10, 10), segment.a);
      //should be moved
      env.assertPoint2DEquals(sketcher_utils.toModel(app, 200, 150), segment.b);
      env.done();
    }));
  },
  
  testLineMove: function(env) {
    test.emptySketch(env.test((win, app) => {
      const initA = vec(10, 10);
      const initB = vec(100, 100);
      const segment = addSegment(app, initA.x, initA.y, initB.x, initB.y);
      const from = vec(50, 50);
      const moveDelta = vec(100, 50);
      sketcher_utils.move(app, from, from.plus(moveDelta));
      env.assertPoint2DEquals(sketcher_utils.toModelP(app, initA.plus(moveDelta)), segment.a);
      env.assertPoint2DEquals(sketcher_utils.toModelP(app, initB.plus(moveDelta)), segment.b);
      env.done();
    }));
  }
}

function vec() {
  return new Vector(arguments);
}

function collectObjects(visitable) {
  const objects = [];
  visitable.accept((o) => {
    objects.push(o);
  });
  return objects;
}