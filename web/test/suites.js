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
  
};

function TestCase(name) {
  let tests = require('./cases/' + name).default;
  tests = Object.keys(tests).filter(key => key.startsWith('test')).map(key => tests[key]);
  return {
    name, tests
  }
}
