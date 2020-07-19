import * as test from '../../test'
import {deepMerge} from '../coreTests/utils/deep-merge'
import {Matrix3x4} from "math/matrix";

const OPERANDS_MODE = false;

const CASE = {

  testSmokedSalmon: function (env) {
    test.modeller(env.test((win, app) => {
      const box1 = app.TPI.brep.primitives.box(500, 500, 500);
      const box2 = app.TPI.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));
      const box3 = app.TPI.brep.primitives.box(150, 600, 350, new Matrix3x4().translate(25, 25, -250));
      let result = app.TPI.brep.bool.subtract(box1, box2);
      result = app.TPI.brep.bool.subtract(result, box3);
      app.TPI.addShellOnScene(result);
      env.done();
    }));
  },

  /**
   * https://github.com/xibyte/jsketcher/issues/47
   */
  testFacesAreInSamePlane_BUG_47: function(env) {
    test.modeller(env.test((win, app) => {

      const mat = new Matrix3x4();
      const m = mat.translate(0, 0, 10);
      
      const box1 = app.TPI.brep.primitives.box(100, 100, 100, undefined);
      const box2 = app.TPI.brep.primitives.box(100, 100, 100, mat);
      const shell = app.TPI.brep.bool.union(box1, box2);
  
      // app.exposure.addShellOnScene(box1);
      // app.exposure.addShellOnScene(box2);
      app.TPI.addShellOnScene(shell);
      env.done();
    }));
  }

};

def('simple.union');
def('simple.intersect');
def('simple.subtract');
def('overlap.face.intersect');
def('overlap.face.subtract');
def('overlap.face.half.intersect');
def('overlap.face.half.subtract');
def('overlap.face.edge1.intersect');
def('overlap.face.edge1.subtract');
def('overlap.face.edge1.half.intersect');
def('overlap.face.edge1.half.subtract');
def('overlap.face.edge2.intersect');
def('overlap.face.edge2.subtract');
def('overlap.face.edge2.half.intersect');
def('overlap.face.edge2.half.subtract');
def('overlap.face.inside.intersect');
def('overlap.face.inside.subtract');
def('overlap.face.inside.half.intersect');
def('overlap.face.inside.half.subtract');
def('overlap.kiss.edge.intersect');
def('overlap.kiss.edge.subtract');
def('overlap.kiss.edge.half.intersect');
def('overlap.kiss.edge.half.subtract');
def('overlap.kiss.edge4.intersect');
def('overlap.kiss.edge4.subtract');
def('overlap.kiss.edge4.half.intersect');
def('overlap.kiss.edge4.half.subtract');

def('star.intersect');
def('star.subtract');

function def(name) {
  const funcName = 'test' + name.split(/\./).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  CASE[funcName] = function (env) {
    test.modeller(env.test((win, app) => {
      ddt(env, app, name);
    }));
  };
}


function ddt(env, app, name) {
  const input = getInput(name);
  const result = performOperation(app, input);
  app.TPI.addShellOnScene(result);
  compare(env, app, name, result);
  env.done();
}

function compare(env, app, name, result) {
  const out = require('./data/brep/' + name + '/out.json');
  const resultData = shellToData(app.TPI.brep.IO, out.format, result);
  env.assertData(out, resultData);
}

function shellToData(io, format, shell) {
  if (format == 'LOOPS') {
    return io.toLoops(shell);    
  } else {
    throw 'unsupported type: ' + format;
  }
}

function getInput(name) {
  const input = readInput(name);
  if (input.overrides) {
    const overrides = readInput(input.overrides);
    return deepMerge({}, overrides, input);
  }
  return input;
}

function readInput(name) {
  return require('./data/brep/' + name + '/in.json');
}

function materialize(tpi, def) {
  if (def.type == 'EXTRUDE') {
    return tpi.brep.createPrism(def.base.map(p => new tpi.brep.geom.Point().set3(p)), def.height);
  } else {
    throw 'unsupported type: ' + def.type;
  }
}

function performOperation(app, input) {
  const A = materialize(app.TPI, input.A);
  const B = materialize(app.TPI, input.B);
  
  if (OPERANDS_MODE) {
    app.TPI.addShellOnScene(A, {  
      color: 0x800080,
      transparent: true,
      opacity: 0.5,
    });
    app.TPI.addShellOnScene(B, {
      color: 0xfff44f,
      transparent: true,
      opacity: 0.5,
    });
    //throw '!operands mode. turn it off!'
  }

  const bool = app.TPI.brep.bool;
  
  if (input.operation == 'UNION') {
    return bool.union(A, B);
  } else if (input.operation == 'INTERSECT') {
    return bool.intersect(A, B);
  } else if (input.operation == 'SUBTRACT') {
    return bool.subtract(A, B);
  } else {
    throw 'unknown operation: ' + input.operation;
  } 
}

export default CASE;
