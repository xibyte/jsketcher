TCAD.TWO.Constraints = {};

TCAD.TWO.ParametricManager = function(viewer) {
  this.viewer = viewer;
  this.system = [];
  this.REQUEST_COUNTER = 0;
};

TCAD.TWO.ParametricManager.prototype.add = function(constr) {
  this.system.push(constr);
  this.solve();
};

TCAD.TWO.ParametricManager.prototype._fetchTwoPoints = function(objs) {
  var points = [];
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.EndPoint') {
      points.push(objs[i]);
    } else if (objs[i]._class == 'TCAD.TWO.Segment') {
      points.push(objs[i].a);
      points.push(objs[i].b);
    }
  }
  if (points.length < 2) {
    throw "Illegal Argument. Constraint requires 2 points or 1 line."
  }
  return points;
}

TCAD.TWO.ParametricManager.prototype.vertical = function(objs) {
  var p = this._fetchTwoPoints(objs);
  this.add(new TCAD.TWO.Constraints.Equal(p[0]._x, p[1]._x));
};

TCAD.TWO.ParametricManager.prototype.horizontal = function(objs) {
  var p = this._fetchTwoPoints(objs);
  this.add(new TCAD.TWO.Constraints.Equal(p[0]._y, p[1]._y));
};

TCAD.TWO.ParametricManager.prototype.p2lDistance = function(objs) {
  var target = null;
  var segment = null;
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.EndPoint') {
      target = objs[i];
    } else if (objs[i]._class == 'TCAD.TWO.Segment') {
      segment = objs[i];
    }
  }
  if (target == null || segment == null) {
    throw "Illegal Argument. P2LDistance requires point and line."
  }
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
        this.system.push(new TCAD.TWO.Constraints.Equal(objs[i]._x, objs[last]._x));
        this.system.push(new TCAD.TWO.Constraints.Equal(objs[i]._y, objs[last]._y));
      }
    }
  }
  this.viewer.refresh();
  this.solve();
};

TCAD.TWO.ParametricManager.prototype.solve = function() {
  var pdict = {};
  var refsCounter = 0;
  var params = [];
  var data = {params : [], constraints: []};
  for (var i = 0; i < this.system.length; ++i) {
    var sdata = this.system[i].getSolveData();
    var prefs = [];
    var constr = [sdata[0], prefs, sdata[2]];
    data.constraints.push(constr);
    for (var p = 0; p < sdata[1].length; ++p) {
      var param = sdata[1][p];
      var pref = pdict[param.id];
      if (pref === undefined) {
        var pref = refsCounter++;
        data.params.push(param.get());
        params.push(param);
        pdict[param.id] = pref;
      }
      prefs.push(pref);
    }
  }
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  var pm = this;
  var request = {reqId : this.REQUEST_COUNTER ++, system : data}
  xhr.onreadystatechange=function() {
    if (xhr.readyState==4 && xhr.status==200) {
      var response = JSON.parse(xhr.responseText);
      if (response.reqId != request.reqId) {
        return;
      }
      for (var p = 0; p < response.params.length; ++p) {
        params[p].set(response.params[p]);
      }
      pm.viewer.refresh();
    }
  }
  xhr.open("POST", "http://localhost:8080/solve", true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.send(JSON.stringify(request));
};

TCAD.TWO.Constraints.Equal = function(p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
};

TCAD.TWO.Constraints.Equal.prototype.getSolveData = function() {
  return ['equal', [this.p1, this.p2], []];
};

TCAD.TWO.Constraints.Parallel = function(l1, l2) {
  this.l1 = l2;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Parallel.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return ['parallel', params, []];
};

TCAD.TWO.Constraints.Parallel.prototype.setParams = function(params) {
  l1.a._x.set(params[0]);
  l1.a._y.set(params[1]);
  l1.b._x.set(params[2]);
  l1.b._y.set(params[3]);
  l2.a._x.set(params[4]);
  l2.a._y.set(params[5]);
  l2.b._x.set(params[6]);
  l2.b._y.set(params[7]);
}

TCAD.TWO.Constraints.Perpendicular = function(l1, l2) {
  this.l1 = l2;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Perpendicular.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return ['perpendicular', params, []];
};

TCAD.TWO.Constraints.Perpendicular.prototype.setParams = function(params) {
  l1.a._x.set(params[0]);
  l1.a._y.set(params[1]);
  l1.b._x.set(params[2]);
  l1.b._y.set(params[3]);
  l2.a._x.set(params[4]);
  l2.a._y.set(params[5]);
  l2.b._x.set(params[6]);
  l2.b._y.set(params[7]);
}


TCAD.TWO.Constraints.P2LDistance = function(l, p, d) {
  this.l = l;
  this.p = p;
  this.d = d;
  this.functional = 'P2LDistance';
};

TCAD.TWO.Constraints.P2LDistance.prototype.getSolveData = function() {
  return ['P2LDistance', [p._x, p._y, l.a._x, l.a._y, l.b._x, l.b._y], [d]];
};

TCAD.TWO.Constraints.P2LDistance.prototype.setParams = function(params) {
  p._x  .set(params[0]);
  p._y  .set(params[1]);
  l.a._x.set(params[2]);
  l.a._y.set(params[3]);
  l.b._x.set(params[4]);
  l.b._y.set(params[5]);
}

