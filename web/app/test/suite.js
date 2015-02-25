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
}

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

_assertEq = function(expected, actual, msg) {
  if (expected !== actual) {
    _log("<b class='err'>*</b> Assertion Error. Expected [" + expected + "], but was [" + actual + "]");
    if (!!msg) _log(msg);
  }
};

_assertEqD = function(expected, actual, precision, msg) {
  if (Math.abs(expected - actual) > precision) {
    _log("<b class='err'>*</b> Assertion Error. Expected [" + expected + "] with precision " + precision + " but was [" + actual + "]");
    if (!!msg) _log(msg);
  }
};
