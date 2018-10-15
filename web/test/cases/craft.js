import * as test from '../test';

export default {

  testPlanes: env => {
    test.modeller(env.testTPI(tpi => {
      
      tpi.services.action.run('PLANE');
      
      console.dir(tpi);
      
      env.done();
    }));
  },

};
