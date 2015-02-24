TCAD.test = {};
TCAD.test.cases = {};

TCAD.test.runSuite = function() {
  for (var p in TCAD.test.cases) {
    _log("... Run test " + p);
    TCAD.test.cases[p].apply();
  }
  _log("DONE.");
};

function _log(text) {
  $('#testOutput').append("<div>"+text+"</div>");
};

_loadFixture = function(name) {
  THE_APP.loadSketch(TCAD.test.fixtures[name]);
};

_assertEq = function(expected, actual, msg) {
  if (expected !== actual) {
    _log("<b class='err'>*</b> Assertion Error. Expected [" + expected + "], but was [" + actual + "]");
    if (!!msg) _log(msg);
  }
};
