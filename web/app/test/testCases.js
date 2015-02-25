
TCAD.test.cases.roundRect = function() {
  _loadFixture("RoundRect");
  _assertEq(1, APP.viewer.parametricManager.subSystems.length);
  _assertEq(31, APP.viewer.parametricManager.subSystems[0].constraints.length);
  
  var ep = APP.viewer.findById(28);
  var pm = APP.viewer.parametricManager;
  _assertEqD(0.00002047865, pm.prepare([]).solvers[0].system.error(), 0.00000000001);
  ep.x += 30;
  var solver = pm.prepare([]).solvers[0];
  _assertEqD(60, solver.system.error(), 0.01);
  solver.solve(true);
  _assertEqD(0.000005, solver.system.error(), 1e-6);
};

