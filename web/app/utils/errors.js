
export const ERROR_TYPE = 'CAD_ERROR';

export function isTCADError(err) {
  return err && err.type === ERROR_TYPE;
}

export default class CadError extends Error {

  constructor(code, payload) {
    super(code);
    this.code = code;
    this.payload = payload;
    this.type = ERROR_TYPE;
  }
}
