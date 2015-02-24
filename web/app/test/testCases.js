
TCAD.test.cases.roundRect = function() {
  _loadFixture("RoundRect");
  _assertEq(31, THE_APP.viewer.parametricManager.system.length);
//  var solver = THE_APP.viewer.parametricManager.prepare([]);
//  var status = solver.solve(1);
//  _assertEq(1, status.returnCode);
//  _assertEq(1, status.evalCount);
//  _assertEq(1, status.error);
};
