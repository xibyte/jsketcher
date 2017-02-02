
export function FailError(msg) {
  this.msg = msg;
  this.stack = (new Error()).stack;
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
    if (this.finished) {
      return;
    }
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

  terminateOnError(error) {
    this.failed = true;
    this.error = error + "";
    this.done();
    throw error;
  }

  test(testBlock) {
    const env = this;
    return function() {
      try {
        testBlock.apply(this, arguments);
      } catch (e) {
        if (!env.finished) {
          env.terminateOnError(e);
        }
        console.error(e.stack);
        throw e;
      }
    }
  }
  
  assertTrue(stmt, msg) {
    if (!stmt) {
      this.fail('assertTrue fails.', msg);
    }
  }
  
  assertFalse(stmt, msg) {
    if (stmt) {
      this.fail('assertFalse fails.', msg);
    }
  }
  
  assertEquals(expected, actual, msg) {
    if (expected !== actual) {
      this.fail('assertEquals: Expected: ' + expected + ' but was ' + actual, msg);
    }
  }

  assertFloatEquals(expected, actual, msg) {
    if (Math.abs(expected - actual) >= 1E-6) {
      this.fail('assertFloatEquals: Expected: ' + expected + ' but was ' + actual, msg);
    }
  }

  assertPointXY2DEquals(expectedX, expectedY, actual, msg) {
    if (actual.x !== expectedX || actual.y !== expectedY) {
      this.fail('assertPoint2DEquals: Expected: (' +  expectedX + ', ' + expectedY + ') but was (' + actual.x + ', ' + actual.y + ')' , msg);
    }
  }
  
  assertPoint2DEquals(expected, actial, msg) {
    this.assertPointXY2DEquals(expected.x, expected.y, actial, msg);
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

const TEST_PROJECT = '$$$__test__$$$';
const STORAGE_PREFIX_SKETCH = "TCAD.projects.";

export function emptySketch(callback) {
  localStorage.removeItem(STORAGE_PREFIX_SKETCH + TEST_PROJECT);
  sketch(callback);
}

export function sketch(callback) {
  load('/sketcher.html#' + TEST_PROJECT, callback);
}

export function modeller(callback) {
  load('/index.html#' + TEST_PROJECT, callback);
}
