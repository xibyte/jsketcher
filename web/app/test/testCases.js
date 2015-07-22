
TCAD.test.cases.roundRect = function() {
  _loadFixture("RoundRect");
  _assertEq(1, APP.viewer.parametricManager.subSystems.length);
  _assertEq(31, APP.viewer.parametricManager.subSystems[0].constraints.length);
  
  var ep = APP.viewer.findById(28);
  var pm = APP.viewer.parametricManager;
  _assertEqD(0.00002047865, pm.prepare([]).solvers[0].error(), 1e-12);
  ep.x += 30;
  var solver = pm.prepare([]).solvers[0];
  _assertEqD(60, solver.error(), 0.01);
  var status = solver.solve(true);
  _assertEqD(0.000005, solver.error(), 1e-8);
  _assertEq(12, status.evalCount);
  _assertEq(1, status.returnCode);
  var status = solver.solve(false);
  _assertEqD(1.4575007867279055e-10, solver.error(), 1e-12);
  _assertEq(20, status.evalCount);
  _assertEq(1, status.returnCode);
};

