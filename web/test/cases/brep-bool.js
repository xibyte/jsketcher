import * as test from '../test'
import {Matrix3} from '../../app/math/l3space'

export default {

  testNormalIntersection: function (env) {
    test.modeller(env.test((win, app) => {
      const box1 = app.TPI.brep.primitives.box(500, 500, 500);
      const box2 = app.TPI.brep.primitives.box(250, 250, 750, new Matrix3().translate(25, 25, 0));
      const box3 = app.TPI.brep.primitives.box(150, 600, 350, new Matrix3().translate(25, 25, -250));
      let result = app.TPI.brep.bool.subtract(box1, box2);
      result = app.TPI.brep.bool.subtract(result, box3);
      app.addShellOnScene(result);
      env.done();
    }));
  }


}
