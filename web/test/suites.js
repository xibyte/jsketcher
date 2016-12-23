export default {
  SketcherIO: [
    TestCase('segment-io'), 
    TestCase('arc-io') 
  ],
  
  SketcherTools: [

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
