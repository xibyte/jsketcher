import * as test from '../test'
import * as sketcher_utils from '../utils/sketcherUtils'
import {TestMouseEvent} from '../utils/mouseEvent'
import Vector from 'math/vector';

export default {
  testRefreshHappensOnce: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testConstantsIsDefined: function (env) {
    test.emptySketch(env.test((win, app) => {
      win.prompt = function() {
        setTimeout(() => {
          env.assertEquals('OFFSET0 = 30', app.viewer.params.constantDefinition);

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

    }));
  },
  
  testCWAndCCWSame: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testNonConvex: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testStart: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testTwoArcs: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testThreeArcs: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testCircle: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

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

    }));
  },

  testQuadrilateral: function (env) {
    test.emptySketch(env.test((win, app) => {
      win.prompt = function() {
      };

    }));
  },

  testPentagon: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testHexagon: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testAfterRectangleTool: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testRectWithFillet: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testAgainstBoundary: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  },

  testDegradingGeom: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');

    }));
  }
}

function findMarked(app) {
  return app.viewer.activeLayer.objects.filter(o => o.marked && o.marked.strokeStyle == "#00FF00");
}

const vec = (x, y) => new Vector(x, y); 