import {readShellEntityFromJson} from "cad/scene/wrappers/entityIO";

export function toCString(str) {
  let buffer = _malloc(str.length + 1);
  writeAsciiToMemory(str, buffer);
  return buffer;
}

export function CallCommand(command, args) {

  let c_strings = args.map(x => toCString(x));

  let c_arr = _malloc(c_strings.length * 4); // 4-bytes per pointer
  c_strings.forEach(function (x, i) {
    Module.setValue(c_arr + i * 4, x, "i32");
  });

  const commandPtr = toCString(command);

  let rc = Module._CallCommand(commandPtr, c_strings.length, c_arr);

  // c_strings.forEach(_free);

  // free c_arr
  _free(c_arr);

//   _free(commandPtr);

  // return
  return rc;
}

export function Interrogate(shapeName) {
  const shapeNamePtr = toCString(shapeName);
  Module._Interogate(shapeNamePtr);
  _free(shapeNamePtr);
  return window.__OCI_EXCHANGE_VAL;
}