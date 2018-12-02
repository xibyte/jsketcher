/**
 * This is an internal alternative to native engine. It overrides basic 3d part design operations
 */

let BOOLEAN_TYPES = {
  UNION : 1,
  SUBTRACT: 2,
  INTERSECT: 3
};

let CURVE_TYPES = {
  SEGMENT: 1,
  B_SPLINE: 2,
  CIRCLE: 3,
  ARC: 4
};

const DEFLECTION = 2;
const TOLERANCE = 1e-3;

export function activate(ctx) {

  loadWasm(ctx);

  ctx.services.operation.handlers.push(operationHandler);
  function shellsToPointers(shells) {
    return shells.filter(managedByE0).map(m => m.brepShell.data.externals.ptr);
  }
  function booleanBasedOperation(engineParams, params, impl) {
    engineParams.deflection = DEFLECTION;
    if (params.boolean && BOOLEAN_TYPES[params.boolean.type] > 0) {
      engineParams.boolean = {
        type: BOOLEAN_TYPES[params.boolean.type],
        operands: shellsToPointers(params.boolean.operands),
        tolerance: TOLERANCE,
      }
    }
    let data = callEngine(engineParams, impl);
    let consumed = [];
    if (params.boolean) {
      data.consumed.forEach(ptr => {
        let model = params.boolean.operands.find(m => managedByE0(m) && m.brepShell.data.externals.ptr === ptr);
        if (model) {
          consumed.push(model);
        }
      });
    }
    return {
      consumed,
      created: data.created.map(shape => readShellData(shape))
    }
  }
  ctx.services.craftEngine = {
    createBox: function(params) {
      return booleanBasedOperation({
        csys: writeCsys(params.csys),
        dx: params.width,
        dy: params.height,
        dz: params.depth
      }, params, Module._SPI_box);
    },
    createTorus: function(params) {
      return booleanBasedOperation({
        csys: writeCsys(params.csys),
        r1: params.radius,
        r2: params.tube
      }, params, Module._SPI_torus);
    },
    createCone: function(params) {
      return booleanBasedOperation({
        csys: writeCsys(params.csys, true),
        r1: params.radius,
        r2: params.frustum,
        h: params.height
      }, params, Module._SPI_cone);
    },
    createCylinder: function(params) {
      return booleanBasedOperation({
        csys: writeCsys(params.csys, true),
        r: params.radius,
        h: params.height,
      }, params, Module._SPI_cylinder);
    },
    createSphere: function(params) {
      return booleanBasedOperation({
        csys: writeCsys(params.csys),
        r: params.radius,
      }, params, Module._SPI_sphere);
    },
    boolean: function({type, operandsA, operandsB}) {
      let engineParams = {
        type: BOOLEAN_TYPES[type],
        operandsA: shellsToPointers(operandsA),
        operandsB: shellsToPointers(operandsB),
        tolerance: TOLERANCE,
        deflection: DEFLECTION,
      };
      let data = callEngine(engineParams, Module._SPI_boolean);
      let consumed = [...operandsA, ...operandsB];
      return {
        consumed,
        created: [readShellData(data.result, consumed, operandsA[0].csys)]
      }
    }
  }
}

function writeCsys(csys, swapToY) {
  return {
    origin: csys.origin.data(),
    normal: (swapToY ? csys.y : csys.z).data(),
    xDir: csys.x.data()
  };
}

function operationHandler(id, request, services) {
  switch (id) {
    case 'CUT':
    case 'EXTRUDE': {

      let isCut = id === 'CUT';
      let {request: engineReq, face} = createExtrudeCommand(request, services, isCut);
      if (managedByE0(face.shell)) {
        engineReq.boolean = {
          type: isCut ? BOOLEAN_TYPES.SUBTRACT : BOOLEAN_TYPES.UNION,
          operand: face.shell.brepShell.data.externals.ptr
        }
      }

      let data = callEngine(engineReq, Module._SPI_extrude);

      return singleShellRespone(face.shell, data);
    }
    case 'REVOLVE': {
      let {request: engineReq, face} = createRevolveCommand(request, services);
      if (managedByE0(face.shell)) {
        engineReq.boolean = {
          type: request.subtract ? BOOLEAN_TYPES.SUBTRACT : BOOLEAN_TYPES.UNION,
          operand: face.shell.brepShell.data.externals.ptr
        }
      }
      let data = callEngine(engineReq, Module._SPI_revolve);
      return singleShellRespone(face.shell, data);
    }
    case 'FILLET': {
      let edge = services.cadRegistry.findEdge(request.edges[0].edge);

      let engineReq = Object.assign({}, request, {
        deflection: DEFLECTION,
        solid: edge.shell.brepShell.data.externals.ptr,
        edges: request.edges.map(e => Object.assign({}, e, {edge: services.cadRegistry.findEdge(e.edge).brepEdge.data.externals.ptr}))
      });

      let data = callEngine(engineReq, Module._SPI_fillet);
      return singleShellRespone(edge.shell, data);
    }
  }
}

function singleShellRespone(oldShell, newShellData) {
  if (newShellData.error) {
    throw 'operation failed';
  }

  let consumed = [oldShell];
  let created = readShellData(newShellData, consumed, oldShell.csys);
  return {
    consumed: consumed,
    created: [created]
  };
}

function readShellData(data, consumed, csys) {
  let tpi = __CAD_APP.services.tpi;
  let model = new tpi.scene.readShellEntityFromJson(data, consumed, csys);
  model.brepShell.data.externals.engine = 'e0';
  return model;
}

function managedByE0(mShell) {
  let externals = mShell.brepShell && mShell.brepShell.data && mShell.brepShell.data.externals;
  return externals && externals.engine === 'e0';
}

function readSketch(face, request, sketcher) {
  let sketch = sketcher.readSketch(face.id);
  if (!sketch) throw 'illegal state';

  let tr = face.csys.outTransformation;
  let paths = sketch.fetchContours().map(c => {
    let path = [];
    c.segments.forEach(s => {
      if (s.isCurve()) {
        if (s.constructor.name === 'Circle') {
          const dir = face.csys.z.data();
          path.push({TYPE: CURVE_TYPES.CIRCLE, c: tr.apply(s.c).data(), dir, r: s.r});
        } else if (s.constructor.name === 'Arc') {
          let a = s.inverted ? s.b : s.a;
          let b = s.inverted ? s.a : s.b;
          path.push({
            TYPE: CURVE_TYPES.ARC,
            a: tr.apply(a).data(),
            b: tr.apply(b).data(),
            tangent: tr._apply(a.minus(s.c))._cross(face.csys.z)._normalize()._negate().data()
          });
        } else {
          let nurbs = s.toNurbs(face.csys).impl;
          path.push(Object.assign({TYPE: CURVE_TYPES.B_SPLINE}, nurbs.serialize()));
        }
      } else {
        let ab = [s.a, s.b];
        if (s.inverted) {
          ab.reverse();
        }
        ab = ab.map(v => tr.apply(v).data());
        path.push({TYPE: CURVE_TYPES.SEGMENT, a: ab[0], b: ab[1]});
      }
    });
    return path;
  });
  return paths;
}

function createExtrudeCommand(request, {cadRegistry, sketcher}, invert) {
  const face = cadRegistry.findFace(request.face);
  const paths = readSketch(face, request, sketcher);

  let val = request.value;
  if (invert) {
    val *= -1;
  }
  return {
    face,
    request: {
      vector: face.csys.z.multiply(val).data(),
      sketch: paths,
      tolerance: TOLERANCE,
      deflection: DEFLECTION
    }
  };
}

function createRevolveCommand(request, {cadRegistry, sketcher}) {
  const face = cadRegistry.findFace(request.face);
  const paths = readSketch(face, request, sketcher);

  let pivot = cadRegistry.findSketchObject(request.axis).sketchPrimitive;
  let tr = face.csys.outTransformation;
  let vec = __CAD_APP.services.tpi.math.vec;
  let axisOrigin = tr._apply3(pivot.a.data());
  let axisDir = vec._normalize(vec._sub(tr._apply3(pivot.b.data()), axisOrigin))

  return {
    face,
    request: {
      axisOrigin,
      axisDir,
      angle: request.angle / 180.0 * Math.PI,
      sketch: paths,
      tolerance: TOLERANCE,
      deflection: DEFLECTION
    }
  };
}


function toCString(str) {
  let buffer = Module._malloc(str.length + 1);
  writeAsciiToMemory(str, buffer);
  return buffer;
}

function callEngine(request, engineFunc) {
  let toCStringRequest = toCString(JSON.stringify(request));
  engineFunc(toCStringRequest);
  Module._free(toCStringRequest);
  return __E0_ENGINE_EXCHANGE_VAL;
}


let __E0_ENGINE_EXCHANGE_VAL = null;
window.__E0_ENGINE_EXCHANGE = function(objStr) {
  __E0_ENGINE_EXCHANGE_VAL = JSON.parse(objStr);
  // let tpi = __CAD_APP.services.tpi;
  // let sceneObject = new tpi.scene.UnmanagedSceneSolid(data, 'SOLID');
  // tpi.addOnScene(sceneObject);
  // __DEBUG__.AddTessDump(obj);
};

function instantiateEngine(importObject, callback) {
  const url = './wasm/e0/main.wasm';
  WebAssembly.instantiateStreaming(fetch(url), importObject).then(results => {
    callback(results.instance);
  });
}

function loadWasm(ctx) {
  ctx.services.lifecycle.startAsyncInitializingJob('e0:loader');

  window.Module = {
    // locateFile: function(file) {
    //   return SERVER_PATH + file;
    // },
    onRuntimeInitialized: function() {
      ctx.services.lifecycle.finishAsyncInitializingJob('e0:loader');
    },
    instantiateWasm: function (importObject, fncReceiveInstance) {
      instantiateEngine(importObject, fncReceiveInstance);
      return {};
    }
  };

  let mainScript = document.createElement('script');
  mainScript.setAttribute('src', './wasm/e0/main.js');
  mainScript.setAttribute('async', 'async');
  document.head.appendChild(mainScript);
}
