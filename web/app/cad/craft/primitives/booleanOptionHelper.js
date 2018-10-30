
export function assignBooleanParams(execParams, rawParams, getAllShells) {
  if (rawParams.boolean) {
    execParams.boolean = {
      type: rawParams.boolean,
      operands: getAllShells()
    }
  }
  return execParams;  
}