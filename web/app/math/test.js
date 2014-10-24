
function perpAndCoinc() {
  var sys = [];
  var ID = 0;
  var l1 = {
    p1 : {
      x : new TCAD.parametric.Param(ID++, 10),
      y : new TCAD.parametric.Param(ID++, 10)
    },
    p2 : {
      x : new TCAD.parametric.Param(ID++, 300),
      y : new TCAD.parametric.Param(ID++, 300)
    }
  };
  
  
  var l2 = {
    p1 : {
      x : new TCAD.parametric.Param(ID++, 10 + 100),
      y : new TCAD.parametric.Param(ID++, -10 + 100)
    },
    p2 : {
      x : new TCAD.parametric.Param(ID++, 300 + 100),
      y : new TCAD.parametric.Param(ID++, -300 + 100)
    }
  };
  
  
  sys.push(new TCAD.constraints.Perpendicular([l1.p1.x, l1.p1.y, l1.p2.x, l1.p2.y, l2.p1.x, l2.p1.y, l2.p2.x, l2.p2.y]));
  sys.push(new TCAD.constraints.Equal([l1.p1.x, l2.p1.x]));
  sys.push(new TCAD.constraints.Equal([l1.p1.y, l2.p1.y]));
  
  return sys;
  
}


function testCompare() {
  var bfgs_ = perpAndCoinc();
  var lm_ = perpAndCoinc();
  var tr_ = perpAndCoinc();
  
  var bfgs = TCAD.parametric.solve(bfgs_, [], 0, 1);
  var lm = TCAD.parametric.solve(lm_, [], 0, 0);
  var tr = TCAD.parametric.solve(tr_, [], 0, 2);
  
  console.log("bfgs: " + bfgs.errorSquare());
  console.log("lm: " + lm.errorSquare());
  console.log("trusted region: " + tr.errorSquare());
}



