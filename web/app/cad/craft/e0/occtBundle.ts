import {GenericWASMEngine_V1} from "engine/impl/wasm/GenericWASMEngine_V1";
import {CraftEngine} from "./craftEngine";
import {createOCCService, OCCService} from "cad/craft/e0/occService";

export interface OCCBundleContext {

  craftEngine: CraftEngine; // to be removed

  occService: OCCService;
}

export function activate(ctx) {

  loadWasm(ctx);

  const wasmEngine = new GenericWASMEngine_V1();

  ctx.services.craftEngine = new CraftEngine(wasmEngine, ctx);
  ctx.craftEngine = ctx.services.craftEngine;

  // ctx.modellingEngine = OCCModellingEngine(OCI.EngineCommand);
  ctx.occService = createOCCService(ctx);
}

function instantiateEngine(importObject, callback) {
  const url = './lib-assets/jsketcher-occ-engine/occt.wasm';

  WebAssembly.instantiateStreaming(fetch(url), importObject).then(results => {
    callback(results.instance);
  });
}

function loadWasm(ctx) {
  ctx.services.lifecycle.startAsyncInitializingJob('e0:loader');

  // @ts-ignore
  window.Module = {
    // locateFile: function(file) {
    //   return SERVER_PATH + file;
    // },
    onRuntimeInitialized: function() {
      Module._InitCommands();
      ctx.services.lifecycle.finishAsyncInitializingJob('e0:loader');
    },
    instantiateWasm: function (importObject, fncReceiveInstance) {
      instantiateEngine(importObject, fncReceiveInstance);
      return {};
    }
  } as any;

  const mainScript = document.createElement('script');
  mainScript.setAttribute('src', './lib-assets/jsketcher-occ-engine/occt.js');
  mainScript.setAttribute('async', 'async');
  document.head.appendChild(mainScript);
}

export const BundleName = "@OCCT";






