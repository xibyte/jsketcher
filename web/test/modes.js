import * as test from './test';
import modellerUISubject from './utils/subjects/modeller/modellerUISubject';
import {createSketcherSubject} from './utils/subjects/modeller/sketcherUISubject';

export const modellerUI = func => env => {
  test.emptyModeller(env.test(win => {
    let subject = modellerUISubject(win.__CAD_APP);
    func(env, subject);
  }));
};

export const sketcherUI = func => env => {
  test.emptySketch(env.test((win, app) => {
    let subject = createSketcherSubject(app);
    func(env, subject);
  }));
};
