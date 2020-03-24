import * as test from '../../test'
import * as sketcher_utils from '../../utils/sketcherUtils'

export default {
  testCoincident: function (env) {
    test.emptySketch(env.test((win, app) => {
      const s1 = new sketcher_utils.TestSegment(10, 10, 100, 100);
      const s2 = new sketcher_utils.TestSegment(50, 10, 150, 100);
      s1.add(app);
      s2.add(app);
      env.assertEquals(2, app.viewer.activeLayer.objects.length);
      env.assertEquals(0, sketcher_utils.getConstraints(app).length);
      sketcher_utils.click(app, s1.b);
      sketcher_utils.click(app, s2.a, {shiftKey: true});
      env.assertEquals(2, app.viewer.selected.length);
      app.actions['coincident'].action();
      var constraints = sketcher_utils.getConstraints(app);
      env.assertEquals(1, constraints.length);
      env.assertEquals('coi', constraints[0].NAME);
      env.done();
    }));
  },

  testPerpendicular: function (env) {
    test.emptySketch(env.test((win, app) => {
      const s1 = new sketcher_utils.TestSegment(10, 10, 100, 100);
      const s2 = new sketcher_utils.TestSegment(50, 10, 150, 100);
      const ss1 = s1.add(app);
      const ss2 = s2.add(app);
      env.assertEquals(2, app.viewer.activeLayer.objects.length);
      env.assertEquals(0, sketcher_utils.getConstraints(app).length);
      sketcher_utils.click(app, s1.middle());
      sketcher_utils.click(app, s2.middle(), {shiftKey: true});
      app.actions['perpendicularConstraint'].action();
      const constraints = sketcher_utils.getConstraints(app);
      env.assertEquals(1, constraints.length);
      env.assertEquals('perpendicular', constraints[0].NAME);
      const dotProduct = sketcher_utils.segmentAsVector(ss1).dot(sketcher_utils.segmentAsVector(ss2));
      env.assertFloatEquals(0, dotProduct);
      env.done();
    }));
  }

}