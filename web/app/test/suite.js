TCAD.test = {};
TCAD.test.cases = {};

TCAD.test.runSuite = function() {
  for (var p in TCAD.test.cases) {
    _log("... Run test " + p);
    try {
      TCAD.test.cases[p].apply();
    } catch (e) {
      _log("<b class='err'>ERROR: </b>" + e);
      _log((e.stack+"").replace('\n', '<br />'));
      
    }
  }
  _log("DONE.");
};

_loadFixture = function(name) {
  APP.loadSketch(TCAD.test.fixtures[name]);
};

_loadFixturesToLocalStorage = function() {
  for (var p in TCAD.test.fixtures) {
    var key = "test:" + p;
    console.log("Storing: " + key);
    localStorage.setItem("TCAD.projects." + key, JSON.stringify(TCAD.test.fixtures[p]));
  }
};

TCAD.test._ERROR_TITLE = "<b class='err'>*</b> Assertion Error.";


function _log(text) {
  $('#testOutput').append("<div>"+text+"</div>");
}

function _logAssert(msg) {
  _log(TCAD.test._ERROR_TITLE + " " + msg + "<br/>&nbsp;&nbsp;&nbsp;" + new Error("").stack.split('\n')[3]);
}

_assertEq = function(expected, actual, msg) {
  if (expected !== actual) {
    _logAssert("Expected [" + expected + "], but was [" + actual + "]");
    if (!!msg) _log(msg);
  }
};

_assertEqD = function(expected, actual, precision, msg) {
  if (Math.abs(expected - actual) > precision) {
    _logAssert("Expected [" + expected + "] with precision " + precision + " but was [" + actual + "]");
    if (!!msg) _log(msg);
  }
};
