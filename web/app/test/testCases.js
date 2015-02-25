
TCAD.test.cases.roundRect = function() {
  _loadFixture("RoundRect");
  _assertEq(31, APP.viewer.parametricManager.system.length);
  
  var ep = APP.viewer.findById(28);
  var pm = APP.viewer.parametricManager;
  _assertEqD(0.00002047865, pm.prepare([]).system.error(), 0.00000000001);
  ep.x += 30;
  var solver = pm.prepare([]);
  _assertEqD(60, solver.system.error(), 0.01);
  solver.solve();
  _assertEqD(0.000005, solver.system.error(), 1e-6);
};

