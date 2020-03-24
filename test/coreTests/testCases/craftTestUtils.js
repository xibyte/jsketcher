import * as test from '../test';

export function setState(win, app, state) {

  let i = 1;
  let gen = () => i++;
  let pt = ([x, y]) => [gen(), [gen(), x], [gen(), y]];
  for (let sketchId of Object.keys(state.sketches)) {
    let sketch = state.sketches[sketchId];
    let sketchKey = app.TPI.services.project.sketchStorageKey(sketchId);
    win.localStorage.setItem(sketchKey, JSON.stringify({
      layers: [{
        name: 'sketch',
        data: sketch.Segment.map(([a, b]) => ({
          _class: 'TCAD.TWO.Segment',
          id: gen(),
          points: [pt(a), pt(b)],
        }))
      }]
    }));
  }
  app.TPI.services.craft.reset(state.operations);
}

export function assertScene(app, env, expected) {
  let shell = app.TPI.services.cadRegistry.getAllShells()[0].shell;
  env.assertData(expected, app.TPI.brep.IO.toLoops(shell, Math.round));
}

export function defineTest(state, expected) {
  return env => {
    test.emptyModeller(env.test((win, app) => {
      setState(win, app, state);
      assertScene(app, env, expected);
      env.done();
    }));
  }
}

export function defineTests(tests) {
  let out = {};
  for (let {name, state, expected} of tests) {
    out['test' + name] = defineTest(state, expected); 
  }
  return out;
}
