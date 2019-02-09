import * as test from './test';
import * as modes from './modes';

export default {
  SketcherObjects: [
    TestCase('segment'),
    TestCase('arc'),
  ],

  SketcherSolver: [
    TestCase('constraints'),
    TestCase('parametric'),
    
  ],

  SketcherTools: [
    TestCase('offset'),

  ],
  
  Sketcher: [

  ],

  Craft: [
    TestCase('craftPlane'),
    TestCase('craftExtrude'),
  ],

  BREP: [
    TestCase('brep-bool'),
    TestCase('brep-bool-wizard-based'),
    TestCase('brep-bool-smoke'),
    TestCase('brep-bool-topo'),
    TestCase('brep-pip'),
    TestCase('brep-raycast'),
    TestCase('brep-enclose')
  ],

};

function TestCase(name) {
  let testModule = require('./cases/' + name);
  let tests;
  function registerTests(testsHolder, helperWrapper) {
    tests = testsHolder;
    tests = Object.keys(tests).filter(key => key.startsWith('test')).map(key => ({
      name: key,
      func: helperWrapper(tests[key])
    }));

  }
  let mode = modes[testModule.TEST_MODE];
  if (mode) {
    registerTests(testModule, mode);
  } else {
    registerTests(testModule.default, func => env => func(env));
  }
  return {
    name, tests
  }
}
