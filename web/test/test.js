
export function fail(msg, optionalMsg) {
  optionalMsg = (optionalMsg === undefined ? '' : ' ' + optionalMsg);
  throw new AssertionError(msg + optionalMsg);
}

export function assertEquals(expected, actual, msg) {
  if (expected !== actual) {
    fail('assertEquals: Expected: ' + expected + ' but was ' + actual, msg);
  }
}

export function AssertionError(msg) {
  this.msg = msg;
}