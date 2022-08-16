
export function toCString(str) {
  const buffer = _malloc(str.length + 1);
  writeAsciiToMemory(str, buffer);
  return buffer;
}

export function CallCommand(command, args) {

  const c_strings = args.map(x => toCString(x));

  const c_arr = _malloc(c_strings.length * 4); // 4-bytes per pointer
  c_strings.forEach(function (x, i) {
    Module.setValue(c_arr + i * 4, x, "i32");
  });

  const commandPtr = toCString(command);

  const rc = Module._CallCommand(commandPtr, c_strings.length, c_arr);

  // c_strings.forEach(_free);

  _free(c_arr);

//   _free(commandPtr);

  return rc;
}

export function Interrogate(shapeName, structOnly) {
  const shapeNamePtr = toCString(shapeName);
  Module._Interogate(shapeNamePtr, structOnly);
  _free(shapeNamePtr);
  return window.__OCI_EXCHANGE_VAL;
}

export function GetRef(shapeName) {
  const shapeNamePtr = toCString(shapeName);
  const ref = Module._GetRef(shapeNamePtr);
  _free(shapeNamePtr);
  return ref;
}

export function ClassifyPointToFace(facePtr, x, y, z, tol) {
  return Module._ClassifyPointToFace(facePtr, x, y, z, tol);
}

export function ClassifyFaceToFace(face1Ptr, face2Ptr, tol) {
  return Module._ClassifyFaceToFace(face1Ptr, face2Ptr, tol);
}

export function ClassifyEdgeToFace(edgePtr, facePtr, tol){
  return Module._ClassifyEdgeToFace(edgePtr, facePtr, tol);
}

export function IsEdgesOverlap(e1Ptr, e2Ptr, tol) {
  return Module._IsEdgesOverlap(e1Ptr, e2Ptr, tol);
}

export function UpdateTessellation(shapePtr, deflection) {
  return Module._UpdateTessellation(shapePtr, deflection);
}

export function SetLocation(shapeName, matrixArray) {
  const shapeNamePtr = toCString(shapeName);
  const [
    mx0,
    mx1,
    mx2,
    mx3,
    mx4,
    mx5,
    mx6,
    mx7,
    mx8,
    mx9,
    mx10,
    mx11
  ] = matrixArray;
  Module._SetLocation(shapeNamePtr,
    mx0,
    mx1,
    mx2,
    mx3,
    mx4,
    mx5,
    mx6,
    mx7,
    mx8,
    mx9,
    mx10,
    mx11
  );
  _free(shapeNamePtr);
}

export function AddLocation(shapeName, matrixArray) {
  const shapeNamePtr = toCString(shapeName);
  const [
    mx0,
    mx1,
    mx2,
    mx3,
    mx4,
    mx5,
    mx6,
    mx7,
    mx8,
    mx9,
    mx10,
    mx11
  ] = matrixArray;
  Module._AddLocation(shapeNamePtr,
    mx0,
    mx1,
    mx2,
    mx3,
    mx4,
    mx5,
    mx6,
    mx7,
    mx8,
    mx9,
    mx10,
    mx11
  );
  _free(shapeNamePtr);
}

export function importStepFile(shapeName, fileName, oneOnly) {
  const shapeNamePtr = toCString(shapeName);
  const fileNamePtr = toCString(fileName);
  Module._ImportStepFile(shapeNamePtr, fileNamePtr, oneOnly);
  _free(shapeNamePtr);
  _free(fileName);
}
