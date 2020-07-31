import {
  DEFLECTION,
  E0_TOLERANCE,
  managedByE0,
  readShellData,
  readSketch,
  readSketchContour,
  shellsToPointers,
  singleShellRespone,
  writeCsys
} from './common';
import * as vec from 'math/vec';
import {MOpenFaceShell} from '../../model/mopenFace';
import {BooleanType, EngineAPI_V1} from "engine/api";
import {resolveExtrudeVector} from "../cutExtrude/cutExtrude";
import {ApplicationContext} from "context";
import {MBrepShell} from "../../model/mshell";

declare module 'context' {

  interface CoreContext {

    craftEngine: CraftEngine;
  }
}


/**
 * Temporary dump of "bridging" functions between external engines and modeller world
 */
export class CraftEngine {

  modellingEngine: EngineAPI_V1;
  ctx: ApplicationContext;

  constructor(modellingEngine: EngineAPI_V1, ctx: ApplicationContext) {
    this.modellingEngine = modellingEngine;
    this.ctx = ctx;
  }

  boolean({type, operandsA, operandsB}) {
    let engineParams = {
      type: <BooleanType>(BooleanType[type] as any),
      operandsA: shellsToPointers(operandsA),
      operandsB: shellsToPointers(operandsB),
      tolerance: E0_TOLERANCE,
      deflection: DEFLECTION,
    };
    let data = this.modellingEngine.boolean(engineParams) as any;
    let consumed = [...operandsA, ...operandsB];
    return {
      consumed,
      created: [readShellData(data.result, consumed, operandsA[0].csys)]
    }
  }

  createBox(params) {
    return booleanBasedOperation({
      csys: writeCsys(params.csys),
      dx: params.width,
      dy: params.height,
      dz: params.depth
    }, params, (params) => this.modellingEngine.createBox(params));
  }

  createTorus(params) {
    return booleanBasedOperation({
      csys: writeCsys(params.csys),
      r1: params.radius,
      r2: params.tube
    }, params, (params) => this.modellingEngine.createTorus(params));
  }

  createCone(params) {
    return booleanBasedOperation({
      csys: writeCsys(params.csys, true),
      r1: params.radius,
      r2: params.frustum,
      h: params.height
    }, params, (params) => this.modellingEngine.createCone(params));
  }

  createCylinder(params) {
    return booleanBasedOperation({
      csys: writeCsys(params.csys, true),
      r: params.radius,
      h: params.height,
    }, params, (params) => this.modellingEngine.createCylinder(params));
  }

  createSphere(params) {
    return booleanBasedOperation({
      csys: writeCsys(params.csys),
      r: params.radius,
    }, params, (params) => this.modellingEngine.createSphere(params));
  }

  stepImport(params) {

    let shape = this.modellingEngine.stepImport({
      file: params.file
    });

    return {
      consumed: [], created: [readShellData(shape, [], undefined)]
    }
  }

  cutExtrude(isCut, request) {
    let {request: engineReq, face} = createExtrudeCommand(request, this.ctx, isCut);
    if (managedByE0(face.shell)) {
      // @ts-ignore
      engineReq.boolean = {
        type: isCut ? BooleanType.SUBTRACT : BooleanType.UNION,
        operand: face.shell.brepShell.data.externals.ptr
      }
    }

    let data = this.modellingEngine.extrude(engineReq);

    return singleShellRespone(face.shell, data);
  }

  revolve(request) {
    let {request: engineReq, face} = createRevolveCommand(request, this.ctx);
    let data = this.modellingEngine.revolve(engineReq as any);
    return singleShellRespone(face.shell, data);
  }

  loftPreview(params) {
    return this.modellingEngine.loftPreview(params);
  }

  loft(params) {
    let data = this.modellingEngine.loft(mapLoftParams(params));
    let baseShell = params.sections[0].face.shell;
    let consumed = params.sections
      .filter(s => (!(s.face.shell instanceof MOpenFaceShell) || s.face.sketchLoops.length === 1))
      .map(s => s.face.shell);

    return {
      consumed,
      created: [readShellData(data, consumed, baseShell.csys)]
    }
  }

  fillet(request) {
    let edge = this.ctx.cadRegistry.findEdge(request.edges[0]);
    let engineReq = {
      deflection: DEFLECTION,
      solid: edge.shell.brepShell.data.externals.ptr,
      edges: request.edges.map(e => ({
        edge: this.ctx.cadRegistry.findEdge(e).brepEdge.data.externals.ptr,
        thickness: request.thickness
      }))
    };

    let data = this.modellingEngine.fillet(engineReq);
    return singleShellRespone(edge.shell, data);
  }
}

function booleanBasedOperation(engineParams, params, impl) {
  engineParams.deflection = DEFLECTION;
  if (params.boolean && (<any>BooleanType[params.boolean.type]) > 0) {
    engineParams.boolean = {
      type: BooleanType[params.boolean.type],
      operands: shellsToPointers(params.boolean.operands),
      tolerance: E0_TOLERANCE,
    }
  }
  let data = impl(engineParams);
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

const mapLoftParams = params => ({
  sections: params.sections.map(sec => readSketchContour(sec.contour, sec.face)),
  tolerance: E0_TOLERANCE,
  deflection: DEFLECTION
});


function createExtrudeCommand(request, ctx, invert) {
  const face = ctx.cadRegistry.findFace(request.face);
  const paths = readSketch(face, request, ctx.sketchStorageService);

  return {
    face,
    request: {
      vector: resolveExtrudeVector(ctx.cadRegistry, face, request, !invert).data(),
      sketch: paths,
      tolerance: E0_TOLERANCE,
      deflection: DEFLECTION,
    }
  };
}

function createRevolveCommand(request, ctx: ApplicationContext) {
  const {cadRegistry, sketchStorageService} = ctx;
  const face = cadRegistry.findFace(request.face);
  const paths = readSketch(face, request, sketchStorageService);

  let pivot = cadRegistry.findSketchObject(request.axis).sketchPrimitive;
  let tr = face.csys.outTransformation;

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
  // @ts-ignore
  if (managedByE0(face.shell) && request.boolean && BooleanType[request.boolean] > 0) {
    // @ts-ignore
    res.request.boolean = {
      type: BooleanType[request.boolean],
      operand:  (<MBrepShell>face.shell).brepShell.data.externals.ptr
    }
  }
  return res;
}
