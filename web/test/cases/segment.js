import * as test from '../test'
import {TestMouseEvent} from '../utils/mouse-event'

function addSegment(app, aX, aY, bX, bY) {
  app.actions['addSegment'].action();
  app.viewer.toolManager.tool.mouseup(new TestMouseEvent(aX, aY));
  app.viewer.toolManager.tool.mousemove(new TestMouseEvent(bX, bY));
  app.viewer.toolManager.tool.mouseup(new TestMouseEvent(bX, bY));
  app.viewer.toolManager.releaseControl();
}

function click(tool, x, y) {
  tool.mousedown(new TestMouseEvent(x, y));
  tool.mouseup(new TestMouseEvent(x, y));
}

export default {
  testSegmentWizard: function(env) {
    const win = test.emptySketch((win, app) => {
      env.assertEquals(0, app.viewer.activeLayer.objects.length);
      addSegment(app, 10, 10, 100, 100);  
      env.assertEquals(1, app.viewer.activeLayer.objects.length);
      const segment = app.viewer.activeLayer.objects[0];
      env.assertEquals('TCAD.TWO.Segment', segment._class);
      env.assertPoint2DEquals(10, 10, segment.a);
      env.assertPoint2DEquals(101, 100, segment.b);
      env.done();
    });
  }, 
  
  testSaveLoad: function(env) {
    test.emptySketch((win, app) => {
      env.assertEquals(0, app.viewer.activeLayer.objects.length);
      addSegment(app, 10, 10, 100, 100);
      app.actions['save'].action();
      test.sketch((win, app) => {
        env.assertEquals(1, app.viewer.activeLayer.objects.length);
        const segment = app.viewer.activeLayer.objects[0];
        env.assertEquals('TCAD.TWO.Segment', segment._class);
        env.done();
      });
    });
  },
  
  testSelection: function(env) {
    test.emptySketch((win, app) => {
      addSegment(app, 10, 10, 100, 100);
      env.assertEquals(0, app.viewer.selected.length);
      click(app.viewer.toolManager.tool, 50, 50);
      env.assertEquals(1, app.viewer.selected.length);
      env.done();
    });
  },
  
  testSelectionNeighborhood: function(env) {
    test.emptySketch((win, app) => {
      addSegment(app, 10, 10, 100, 100);
      env.assertEquals(0, app.viewer.selected.length);
      // this point technically isn't on the line but should trigger the selection
      click(app.viewer.toolManager.tool, 55, 50);
      env.assertEquals(1, app.viewer.selected.length);
      env.done();
    });
  },

  testSnap: function(env) {
    test.emptySketch((win, app) => {
      addSegment(app, 10, 10, 100, 100);
      env.assertEquals(0, app.viewer.selected.length);
      // this point technically isn't on the line but should trigger the selection
      click(app.viewer.toolManager.tool, 55, 50);
      env.assertEquals(1, app.viewer.selected.length);
      env.done();
    });
  }

}


function collectObjects(visitable) {
  const objects = [];
  visitable.accept((o) => {
    objects.push(o);
  });
  return objects;
}