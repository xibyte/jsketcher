import * as test from '../test'
import * as sketcher_utils from '../utils/sketcher-utils'
import {TestMouseEvent} from '../utils/mouse-event'
import Vector from '../../app/math/vector';

export default {
  testRefreshHappensOnce: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testConstantsIsDefined: function (env) {
    test.emptySketch(env.test((win, app) => {
      win.prompt = function() {
        setTimeout(() => {
          env.assertEquals('OFFSET0 = 30', app.viewer.params.constantDefinition);
          env.done();
        });
        return 30;
      };
      sketcher_utils.polyLine(app, vec(200, 10), vec(400, 200), vec(200, 400), vec(10, 200), vec(200, 10));
      const pickPoint = vec(302, 106);
      app.actions['offsetTool'].action();
      app.viewer.toolManager.tool.mousemove(new TestMouseEvent(pickPoint.x, pickPoint.y, 'move'));
      sketcher_utils.click(app, pickPoint);
    }));
  },

  testConstantsNotClash: function (env) {
    test.emptySketch(env.test((win, app) => {
      app.viewer.params.constantDefinition = 'OFFSET0 = 100';
      win.prompt = function() {
        setTimeout(() => {
          env.assertEquals('OFFSET0 = 100\nOFFSET1 = 30', app.viewer.params.constantDefinition);
          env.done();
        });
        return 30;
      };
      sketcher_utils.polyLine(app, vec(200, 10), vec(400, 200), vec(200, 400), vec(10, 200), vec(200, 10));
      var pickPoint = vec(302, 106);
      app.actions['offsetTool'].action();
      app.viewer.toolManager.tool.mousemove(new TestMouseEvent(pickPoint.x, pickPoint.y, 'move'));
      sketcher_utils.click(app, pickPoint);
    }));
  },
  
  testConstantsInwardArc: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },
  
  testCWAndCCWSame: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testNonConvex: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testStart: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testTwoArcs: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testThreeArcs: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testCircle: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testHighlightLoops: function (env) {
    test.emptySketch(env.test((win, app) => {
      sketcher_utils.polyLine(app, vec(200, 10), vec(400, 200), vec(200, 400), vec(10, 200), vec(200, 10));
      app.actions['offsetTool'].action();
      env.assertEquals(0, findMarked(app).length);
      app.viewer.toolManager.tool.mousemove(new TestMouseEvent(302, 106));
      env.assertEquals(4, findMarked(app).length);
      //let's remove any constraint to break the loop     
      app.viewer.parametricManager.remove(sketcher_utils.getConstraints(app)[0]);

      app.actions['offsetTool'].action();
      app.viewer.toolManager.tool.mousemove(new TestMouseEvent(302, 106));
      env.assertEquals(0, findMarked(app).length);
      env.done();
    }));
  },

  testQuadrilateral: function (env) {
    test.emptySketch(env.test((win, app) => {
      win.prompt = function() {
      };
      env.done();
    }));
  },

  testPentagon: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testHexagon: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testAfterRectangleTool: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testRectWithFillet: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testAgainstBoundary: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testDegradingGeom: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  }
}

function findMarked(app) {
  return app.viewer.activeLayer.objects.filter(o => o.marked && o.marked.strokeStyle == "#00FF00");
}

const vec = (x, y) => new Vector(x, y); 