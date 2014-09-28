TCAD.TWO.Constraints = {};

TCAD.TWO.ParametricManager = function(viewer) {
  this.viewer = viewer;
  this.REQUEST_COUNTER = 0;
};

TCAD.TWO.ParametricManager.prototype.coincident = function(objs) {
  if (objs.length == 0) return;
  var last = objs.length - 1;
  for (var i = 0; i < objs.length; ++i) {
    for (var j = 0; j < objs.length; ++j) {
      if (objs[i] != objs[j]) {
        objs[i].linked.push(objs[j]);
        objs[i].x = objs[last].x;
        objs[i].y = objs[last].y;
        system.push(TCAD.TWO.Constraints.Coincident(objs[i], objs[last]));
      }
    }
  }
  this.viewer.refresh();
  this.system = [];
};

TCAD.TWO.ParametricManager.prototype.solve = function() {
  for (var i = 0; i < this.system.length; ++i) {
    var constr = this.system[i];
    data.push(constr.getSolveData());
  }
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function() {
    if (xhr.readyState==4 && xhr.status==200) {
      var response = JSON.parse(xhr.responseText);
      if (response.reqId != this.REQUEST_COUNTER) {
        return;
      }
      response.sys
    }
  }
  xhr.open("POST", "http://localhost:8080/solve", true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send(JSON.stringify({reqId : this.REQUEST_COUNTER ++, system : data}));
};

TCAD.TWO.Constraints.Coincident = function(p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
};

TCAD.TWO.Constraints.Coincident.prototype.getSolveData = function() {
  return ['equal', [p1.x, p1.y, p2.x, p2.y], []];
};

TCAD.TWO.Constraints.Coincident.prototype.setParams = function(params) {
  p1.x = params[0];
  p1.y = params[1];
  p2.x = params[2];
  p2.y = params[3];
};

TCAD.TWO.Constraints.Parallel = function(l1, l2) {
  this.l1 = l2;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Parallel.prototype.getSolveData = function() {
  return ['parallel', [l1.a.x, l1.a.y, l1.b.x, l1.b.y, l2.a.x, l2.a.y, l2.b.x, l2.b.y], []];
};

TCAD.TWO.Constraints.Parallel.prototype.setParams = function(params) {
  l1.a.x = params[0];
  l1.a.y = params[1];
  l1.b.x = params[2];
  l1.b.y = params[3];
  l2.a.x = params[4];
  l2.a.y = params[5];
  l2.b.x = params[6];
  l2.b.y = params[7];
}

TCAD.TWO.Constraints.Perpendicular = function(l1, l2) {
  this.l1 = l2;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Perpendicular.prototype.getSolveData = function() {
  return ['perpendicular', [l1.a.x, l1.a.y, l1.b.x, l1.b.y, l2.a.x, l2.a.y, l2.b.x, l2.b.y], []];
};

TCAD.TWO.Constraints.Perpendicular.prototype.setParams = function(params) {
  l1.a.x = params[0];
  l1.a.y = params[1];
  l1.b.x = params[2];
  l1.b.y = params[3];
  l2.a.x = params[4];
  l2.a.y = params[5];
  l2.b.x = params[6];
  l2.b.y = params[7];
}


TCAD.TWO.Constraints.P2LDistance = function(l, p, d) {
  this.l = l;
  this.p = p;
  this.d = d;
  this.functional = 'P2LDistance';
};

TCAD.TWO.Constraints.P2LDistance.prototype.getSolveData = function() {
  return ['P2LDistance', [p.x, p.y, l.a.x, l.a.y, l.b.x, l.b.y], [d]];
};

TCAD.TWO.Constraints.P2LDistance.prototype.setParams = function(params) {
  p.x   = params[0];
  p.y   = params[1];
  l.a.x = params[2];
  l.a.y = params[3];
  l.b.x = params[4];
  l.b.y = params[5];
}

