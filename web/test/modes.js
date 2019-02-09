import * as test from './test';
import modellerUISubject from './utils/subjects/modeller/modellerUISubject';

export const modellerUI = func => env => {
  test.emptyModeller(env.test(win => {
    let subject = modellerUISubject(win.__CAD_APP);
    func(env, subject);
  }));
};

