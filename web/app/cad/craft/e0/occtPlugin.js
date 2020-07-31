
import {GenericWASMEngine_V1} from "engine/impl/wasm/GenericWASMEngine_V1";
import {CraftEngine} from "./craftEngine";

export function activate(ctx) {

  loadWasm(ctx);

  const wasmEngine = new GenericWASMEngine_V1();

  ctx.services.craftEngine = new CraftEngine(wasmEngine, ctx);
  ctx.craftEngine = ctx.services.craftEngine;
}

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





