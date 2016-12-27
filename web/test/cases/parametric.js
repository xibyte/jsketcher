import * as test from '../test'

export default {
  testRedundantElimination: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  },

  testNotEliminateCoupledRedundantConstraints: function (env) {
    test.emptySketch(env.test((win, app) => {
      env.fail('implement me');
      env.done();
    }));
  }

}