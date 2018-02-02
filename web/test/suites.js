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

  ModellerOperations: [

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
  let tests = require('./cases/' + name).default;
  tests = Object.keys(tests).filter(key => key.startsWith('test')).map(key => ({
    name: key,
    func: tests[key]
  }));
  return {
    name, tests
  }
}
