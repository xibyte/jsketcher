import {BOOLEAN_TYPES, DEFLECTION, E0_TOLERANCE, managedByE0, readSketch, singleShellRespone} from './common';
import {callEngine} from './interact';
import {resolveExtrudeVector} from '../cutExtrude/cutExtrude';

export default function operationHandler(id, request, services) {
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
      let data = callEngine(engineReq, Module._SPI_revolve);
      return singleShellRespone(face.shell, data);
    }
    case 'FILLET': {
      let edge = services.cadRegistry.findEdge(request.edges[0]);
      let engineReq = {
        deflection: DEFLECTION,
        solid: edge.shell.brepShell.data.externals.ptr,
        edges: request.edges.map(e => ({
          edge: services.cadRegistry.findEdge(e).brepEdge.data.externals.ptr,
          thickness: request.thickness
        }))
      };

      let data = callEngine(engineReq, Module._SPI_fillet);
      return singleShellRespone(edge.shell, data);
    }
  }
}

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

function createRevolveCommand(request, {cadRegistry, sketchStorageService}) {
  const face = cadRegistry.findFace(request.face);
  const paths = readSketch(face, request, sketchStorageService);

  let pivot = cadRegistry.findSketchObject(request.axis).sketchPrimitive;
  let tr = face.csys.outTransformation;
  let vec = __CAD_APP.services.exposure.math.dir;
  let axisOrigin = tr._apply3(pivot.a.data());
  let axisDir = vec._normalize(vec._sub(tr._apply3(pivot.b.data()), axisOrigin))

  let res = {
    face,
    request: {
      axisOrigin,
      axisDir,
      angle: request.angle / 180.0 * Math.PI,
      sketch: paths,
      tolerance: E0_TOLERANCE,
      deflection: DEFLECTION
    }
  };
  if (managedByE0(face.shell) && request.boolean && BOOLEAN_TYPES[request.boolean] > 0) {
    res.request.boolean = {
      type: BOOLEAN_TYPES[request.boolean],
      operand:  face.shell.brepShell.data.externals.ptr
    }
  }
  return res;
}
