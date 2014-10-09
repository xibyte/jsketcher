TCAD.TWO.Constraints = {};

TCAD.TWO.ParametricManager = function(viewer) {
  this.viewer = viewer;
  this.system = [];
  this.REQUEST_COUNTER = 0;
};

TCAD.TWO.ParametricManager.prototype.add = function(constr) {
  this.system.push(constr);
  this.solve();
  this.viewer.refresh();
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
};


TCAD.TWO.ParametricManager.prototype._fetchPointAndLine = function(objs) {

  var point = null;
  var line = null;
  
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.EndPoint') {
      point = objs[i];
    } else if (objs[i]._class == 'TCAD.TWO.Segment') {
      line = objs[i];
    }
  }
  if (point == null || line == null) {
    throw "Illegal Argument. Constraint requires point and line."
  }
  
  return [point, line];
};

TCAD.TWO.ParametricManager.prototype._fetchTwoLines = function(objs) {
  var lines = [];
  for (var i = 0; i < objs.length; ++i) {
    if (objs[i]._class == 'TCAD.TWO.Segment') {
      lines.push(objs[i]);
    }
  }
  if (lines.length < 2) {
    throw "Illegal Argument. Constraint requires 2 lines."
  }
  return lines;
};

TCAD.TWO.ParametricManager.prototype.vertical = function(objs) {
  var p = this._fetchTwoPoints(objs);
  this.add(new TCAD.TWO.Constraints.Equal(p[0]._x, p[1]._x));
};

TCAD.TWO.ParametricManager.prototype.horizontal = function(objs) {
  var p = this._fetchTwoPoints(objs);
  this.add(new TCAD.TWO.Constraints.Equal(p[0]._y, p[1]._y));
};

TCAD.TWO.ParametricManager.prototype.parallel = function(objs) {
  var lines = this._fetchTwoLines(objs);
  this.add(new TCAD.TWO.Constraints.Parallel(lines[0], lines[1]));
};

TCAD.TWO.ParametricManager.prototype.perpendicular = function(objs) {
  var lines = this._fetchTwoLines(objs);
  this.add(new TCAD.TWO.Constraints.Perpendicular(lines[0], lines[1]));
};

TCAD.TWO.ParametricManager.prototype.p2lDistance = function(objs, promptCallback) {
  var pl = this._fetchPointAndLine(objs);

  var target = pl[0];
  var segment = pl[1];
  
  var ex = new TCAD.Vector(-(segment.b.y - segment.a.y), segment.b.x - segment.a.x).normalize();
  var distance = Math.abs(ex.dot(new TCAD.Vector(segment.a.x - target.x, segment.a.y - target.y)));

  var promptDistance = promptCallback("Enter the distance", distance.toFixed(2));
  
  if (promptDistance != null) {
    promptDistance = Number(promptDistance);
    if (promptDistance == promptDistance) { // check for NaN
      this.add(new TCAD.TWO.Constraints.P2LDistance(target, segment, promptDistance));
    }
  }
};

TCAD.TWO.ParametricManager.prototype.p2pDistance = function(objs, promptCallback) {
  var p = this._fetchTwoPoints(objs);
  var distance = new TCAD.Vector(p[1].x - p[0].x, p[1].y - p[0].y).length();
  var promptDistance = promptCallback("Enter the distance", distance.toFixed(2));

  if (promptDistance != null) {
    promptDistance = Number(promptDistance);
    if (promptDistance == promptDistance) { // check for NaN
      this.add(new TCAD.TWO.Constraints.P2PDistance(p[0], p[1], promptDistance));
    }
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

TCAD.TWO.ParametricManager.prototype.solve1 = function(locked, onSolved) {
  var pdict = {};
  var refsCounter = 0;
  var params = [];
  var i;
  var data = {params : [], constraints: [], locked: []};
  for (i = 0; i < this.system.length; ++i) {
    var sdata = this.system[i].getSolveData();
    var prefs = [];
    var constr = [sdata[0], prefs, sdata[2]];
    data.constraints.push(constr);
    for (var p = 0; p < sdata[1].length; ++p) {
      var param = sdata[1][p];
      var pref = pdict[param.id];
      if (pref === undefined) {
        pref = refsCounter++;
        data.params.push(param.get());
        params.push(param);
        pdict[param.id] = pref;
      }
      prefs.push(pref);
    }
  }

  if (locked !== undefined) {
    for (i = 0; i < locked.length; ++i) {
      var lp = pdict[locked[i].id];
      if (lp !== undefined) {
        data.locked.push(lp);
      }
    }
  }

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  var pm = this;
  var request = {reqId : this.REQUEST_COUNTER ++, system : data};
  xhr.onreadystatechange=function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var response = JSON.parse(xhr.responseText);
      if (response.reqId != pm.REQUEST_COUNTER - 1) {
        return;
      }
      for (var p = 0; p < response.params.length; ++p) {
        params[p].set(response.params[p]);
      }
      if (onSolved !== undefined) {
        onSolved();
      }
      pm.viewer.refresh();
    }
  };
  xhr.open("POST", "http://localhost:8080/solve", true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.send(JSON.stringify(request));
};


TCAD.TWO.ParametricManager.prototype.solve = function(locked, fineLevel) {
  var pdict = {};
  var params;
  var i;
  var _constrs = [];

  function getParam(p) {
    var _p = pdict[p.id];
    if (_p === undefined) {
      _p = new TCAD.parametric.Param(p.id, p.get())
      _p._backingParam = p;
      pdict[p.id] = _p;
    }
    return _p;
  }

  for (i = 0; i < this.system.length; ++i) {

    var sdata = this.system[i].getSolveData();
    params = []

    for (var p = 0; p < sdata[1].length; ++p) {
      var _p = getParam(sdata[1][p]);
      params.push(_p);
    }

    var _constr = TCAD.constraints.create(sdata[0], params, sdata[2]);
    _constrs.push(_constr);
  }

  var _locked = [];
  if (locked !== undefined) {
    for (var p = 0; p < locked.length; ++p) {
      _locked[p] = getParam(locked[p]);
    }
  }

  TCAD.parametric.solve(_constrs, _locked, fineLevel);

  for (var p in pdict) {
    var _p = pdict[p];
    _p._backingParam.set(_p.get());
  }
};

TCAD.TWO.Constraints.Equal = function(p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
};

TCAD.TWO.Constraints.Equal.prototype.getSolveData = function() {
  return ['equal', [this.p1, this.p2], []];
};

TCAD.TWO.Constraints.Parallel = function(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Parallel.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return ['parallel', params, []];
};

TCAD.TWO.Constraints.Perpendicular = function(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Perpendicular.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return ['perpendicular', params, []];
};

TCAD.TWO.Constraints.P2LDistance = function(p, l, d) {
  this.p = p;
  this.l = l;
  this.d = d;
};

TCAD.TWO.Constraints.P2LDistance.prototype.getSolveData = function() {
  var params = [];
  this.p.collectParams(params);
  this.l.collectParams(params);
  return ['P2LDistance', params, [this.d]];
};

TCAD.TWO.Constraints.P2PDistance = function(p1, p2, d) {
  this.p1 = p1;
  this.p2 = p2;
  this.d = d;
};

TCAD.TWO.Constraints.P2PDistance.prototype.getSolveData = function() {
  var params = [];
  this.p1.collectParams(params);
  this.p2.collectParams(params);
  return ['P2PDistance', params, [this.d]];
};
