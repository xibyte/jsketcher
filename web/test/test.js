
export function FailError(msg) {
  this.msg = msg;
}

export class TestEnv {

  constructor(callback) {
    this.failed = false;
    this.finished = false;
    this.error = undefined;
    this.callback = callback;
    this.took = performance.now()
  }

  done() {
    this.finished = true;
    this.took = performance.now() - this.took;
    this.callback(this);
  }

  fail(msg, optionalMsg) {
    this.failed = true;
    this.error = msg + (optionalMsg === undefined ? '' : ' ' + optionalMsg);
    this.done();
    throw new FailError(this.error);
  }

  assertTrue(stmt, msg) {
    if (!stmt) {
      this.fail('assertTrue fails.', msg);
    }
  }
  assertEquals(expected, actual, msg) {
    if (expected !== actual) {
      this.fail('assertEquals: Expected: ' + expected + ' but was ' + actual, msg);
    }
  }

  assertPoint2DEquals(expectedX, expectedY, actial, msg) {
    if (actial.x !== expectedX || actial.y !== expectedY) {
      this.fail('assertPoint2DEquals: Expected: (' +  expectedX + ', ' + expectedY + ') but was (' + actial.x + ', ' + actial.y + ')' , msg);
    }
  }
}

export function load(url, callback) {
  const sandbox = $('#sandbox');
  sandbox.empty();
  const frame = $('<iframe>');
  sandbox.append(frame);
  $(function() {   // fire event when iframe is ready
    frame.load(function() {
      const win = frame.get(0).contentWindow;
      callback(win, win._TCAD_APP)
    });
  });
  frame.attr('src', window.location.origin + url)
}

const TEST_SKETCH_PROJECT = '$$$__test__$$$';
const STORAGE_PREFIX_SKETCH = "TCAD.projects.";

export function emptySketch(callback) {
  localStorage.removeItem(STORAGE_PREFIX_SKETCH + TEST_SKETCH_PROJECT);
  sketch(callback);
}

export function sketch(callback) {
  load('/sketcher.html#' + TEST_SKETCH_PROJECT, callback);
}
