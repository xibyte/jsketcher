/**
 * This is an internal alternative to native engine. It overrides basic 3d part design operations
 */
import * as craftMethods from './craftMethods';
import operationHandler from './operationHandler';

export function activate(ctx) {

  loadWasm(ctx);
  
  ctx.services.operation.handlers.push(operationHandler);
  ctx.services.craftEngine = {
    ...craftMethods
  }
}

function instantiateEngine(importObject, callback) {
  const url = '/wasm/e0/main.wasm';
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
  mainScript.setAttribute('src', '/wasm/e0/main.js');
  mainScript.setAttribute('async', 'async');
  document.head.appendChild(mainScript);
}





