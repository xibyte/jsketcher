import {
  BOOLEAN_TYPES, DEFLECTION, E0_TOLERANCE, managedByE0, readShellData, readSketch, readSketchContour, shellsToPointers,
  singleShellRespone,
  writeCsys
} from './common';
import {callEngine} from './interact';
import {resolveExtrudeVector} from '../cutExtrude/cutExtrude';
import {MOpenFaceShell} from '../../model/mopenFace';

export function boolean({type, operandsA, operandsB}) {
  let engineParams = {
    type: BOOLEAN_TYPES[type],
    operandsA: shellsToPointers(operandsA),
    operandsB: shellsToPointers(operandsB),
    tolerance: E0_TOLERANCE,
    deflection: DEFLECTION,
  };
  let data = callEngine(engineParams, Module._SPI_boolean);
  let consumed = [...operandsA, ...operandsB];
  return {
    consumed,
    created: [readShellData(data.result, consumed, operandsA[0].csys)]
  }
}

export function createBox(params) {
  return booleanBasedOperation({
    csys: writeCsys(params.csys),
    dx: params.width,
    dy: params.height,
    dz: params.depth
  }, params, Module._SPI_box);
}

export function createTorus(params) {
  return booleanBasedOperation({
    csys: writeCsys(params.csys),
    r1: params.radius,
    r2: params.tube
  }, params, Module._SPI_torus);
}

export function createCone(params) {
  return booleanBasedOperation({
    csys: writeCsys(params.csys, true),
    r1: params.radius,
    r2: params.frustum,
    h: params.height
  }, params, Module._SPI_cone);
}

export function createCylinder(params) {
  return booleanBasedOperation({
    csys: writeCsys(params.csys, true),
    r: params.radius,
    h: params.height,
  }, params, Module._SPI_cylinder);
}

export function createSphere(params) {
  return booleanBasedOperation({
    csys: writeCsys(params.csys),
    r: params.radius,
  }, params, Module._SPI_sphere);
}

export function stepImport(params) {

  let shape = callEngine({
    file: params.file
  }, Module._SPI_stepImport);

  return {
    consumed: [], created: [readShellData(shape, [], undefined)]
  }
}


function booleanBasedOperation(engineParams, params, impl) {
  engineParams.deflection = DEFLECTION;
  if (params.boolean && BOOLEAN_TYPES[params.boolean.type] > 0) {
    engineParams.boolean = {
      type: BOOLEAN_TYPES[params.boolean.type],
      operands: shellsToPointers(params.boolean.operands),
      tolerance: E0_TOLERANCE,
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
    created: data.created.map(shape => readShellData(shape, consumed, params.csys))
  }
}

function cutExtrude(isCut, request) {

  function createExtrudeCommand(request, {cadRegistry, sketchStorageService}, invert) {
    const face = cadRegistry.findFace(request.face);
    const paths = readSketch(face, request, sketchStorageService);

    return {
      face,
      request: {
        vector: resolveExtrudeVector(cadRegistry, face, request, !invert).data(),
        sketch: paths,
        tolerance: E0_TOLERANCE,
        deflection: DEFLECTION
      }
    };
  }

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

export function cut(params) {
  return cutExtrude(true, params);
}

export function extrude(params) {
  return cutExtrude(false, params);
}

const mapLoftParams = params => ({
  sections: params.sections.map(sec => readSketchContour(sec.contour, sec.face)),
  tolerance: E0_TOLERANCE,
  deflection: DEFLECTION
});

export function loftPreview(params) {
  return callEngine(mapLoftParams(params), Module._SPI_loftPreview);
}

export function loft(params) {
  let data = callEngine(mapLoftParams(params), Module._SPI_loft);
  let baseShell = params.sections[0].face.shell;
  let consumed = params.sections
    .filter(s => (!(s.face.shell instanceof MOpenFaceShell) || s.face.sketchLoops.length === 1))
    .map(s => s.face.shell);
  
  return {
    consumed,
    created: [readShellData(data, consumed, baseShell.csys)]
  }
}
