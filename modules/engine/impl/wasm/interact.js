
export function toCString(str) {
  const buffer = Module._malloc(str.length + 1);
  writeAsciiToMemory(str, buffer);
  return buffer;
}

export function callEngine(request, engineFunc) {
  const toCStringRequest = toCString(JSON.stringify(request));
  engineFunc(toCStringRequest);
  Module._free(toCStringRequest);
  return __E0_ENGINE_EXCHANGE_VAL;
}


// let __E0_ENGINE_EXCHANGE_VAL = null;
// window.__E0_ENGINE_EXCHANGE = function(objStr) {
//   __E0_ENGINE_EXCHANGE_VAL = JSON.parse(objStr);
//   // let exposure = __CAD_APP.services.exposure;
//   // let sceneObject = new exposure.scene.UnmanagedSceneSolid(data, 'SOLID');
//   // exposure.addOnScene(sceneObject);
//   // __DEBUG__.AddTessDump(obj);
// };
