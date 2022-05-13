import {GenericWASMEngine_V1} from "engine/impl/wasm/GenericWASMEngine_V1";
import {CraftEngine} from "./craftEngine";
import {createOCCService, OCCService} from "cad/craft/e0/occService";



declare module 'context' {
  interface CoreContext {
    occService: OCCService;
  }
}

export function activate(ctx) {

  loadWasm(ctx);

  const wasmEngine = new GenericWASMEngine_V1();

  ctx.services.craftEngine = new CraftEngine(wasmEngine, ctx);
  ctx.craftEngine = ctx.services.craftEngine;

  // ctx.modellingEngine = OCCModellingEngine(OCI.EngineCommand);
  ctx.occService = createOCCService(ctx);
}

async function instantiateEngine(importObject, callback) {
  const url = './wasm/e0/main.wasm.gz';
  const buffer = pako.ungzip(await(await fetch(url)).arrayBuffer());

  // A fetched response might be decompressed twice on Firefox.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=610679
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    buffer = ungzip(buffer);
  }

  const result = await WebAssembly.instantiate(buffer, importObject).then(results => {
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
      Module._InitCommands();
      ctx.services.lifecycle.finishAsyncInitializingJob('e0:loader');
    },
    instantiateWasm: function (importObject, fncReceiveInstance) {
      instantiateEngine(importObject, fncReceiveInstance);
      return {};
    }
  } as any;

  let mainScript = document.createElement('script');
  mainScript.setAttribute('src', './wasm/e0/main.js');
  mainScript.setAttribute('async', 'async');
  document.head.appendChild(mainScript);
}





