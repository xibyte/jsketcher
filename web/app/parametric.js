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

TCAD.TWO.ParametricManager.prototype.lock = function(objs) {
  var p = this._fetchPoints(objs);
  for (var i = 0; i < p.length; ++i) {
    this.system.push(new TCAD.TWO.Constraints.EqualsTo(p[i]._x, p[i].x));
    this.system.push(new TCAD.TWO.Constraints.EqualsTo(p[i]._y, p[i].y));
  }
  this.solve();
  this.viewer.refresh();
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

TCAD.TWO.ParametricManager.prototype.tangent = function(objs) {
  var al = this._fetchArcCircAndLine(objs);
  var arc  = al[0];
  var line  = al[1];
  this.add(new TCAD.TWO.Constraints.P2LDistanceV( arc.c, line, arc.r ));
};

TCAD.TWO.ParametricManager.prototype.rr = function(objs) {
  var arcs = this._fetchArkCirc(objs, 2);
  var prev = arcs[0].r;
  for (var i = 1; i < arcs.length; ++i) {
    this.system.push(new TCAD.TWO.Constraints.Equal(prev, arcs[i].r));
    prev = arcs[i].r;
  }
  this.solve();
  this.viewer.refresh();
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

TCAD.TWO.utils.constRef = function(value) {
  return function() {
    return value;    
  };
};

TCAD.TWO.ParametricManager.prototype.p2pDistance = function(objs, promptCallback) {
  var p = this._fetchTwoPoints(objs);
  var distance = new TCAD.Vector(p[1].x - p[0].x, p[1].y - p[0].y).length();
  var promptDistance = promptCallback("Enter the distance", distance.toFixed(2));
  
  if (promptDistance != null) {
    promptDistance = Number(promptDistance);
    if (promptDistance == promptDistance) { // check for NaN
      this.add(new TCAD.TWO.Constraints.P2PDistance(p[0], p[1], TCAD.TWO.utils.constRef(promptDistance)));
    }
  }
};

TCAD.TWO.ParametricManager.prototype.radius = function(objs, promptCallback) {
  var arcs = this._fetchArkCirc(objs, 1);
  var radius = arcs[0].r.get();
  var promptDistance = promptCallback("Enter the radius value", radius.toFixed(2));

  if (promptDistance != null) {
    promptDistance = Number(promptDistance);
    if (promptDistance == promptDistance) { // check for NaN
      for (var i = 0; i < arcs.length; ++i) {
        this.system.push(new TCAD.TWO.Constraints.EqualsTo(arcs[i].r, promptDistance));
      }
      this.solve();
      this.viewer.refresh();
    }
  }
};

TCAD.TWO.ParametricManager.prototype.coincident = function(objs) {
  if (objs.length == 0) return;
  var i;
  var last = objs.length - 1;
  for (i = 0; i < objs.length - 1; ++i) {
    objs[i].x = objs[last].x;
    objs[i].y = objs[last].y;
    this.system.push(new TCAD.TWO.Constraints.Equal(objs[i]._x, objs[last]._x));
    this.system.push(new TCAD.TWO.Constraints.Equal(objs[i]._y, objs[last]._y));
  }

  for (i = 0; i < objs.length; ++i) {
    for (var j = 0; j < objs.length; ++j) {
      if (objs[i].id !== objs[j].id) {
        objs[j].linked.push(objs[i]);
      }
    }
  }
  
  this.solve();
  this.viewer.refresh();
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


TCAD.TWO.ParametricManager.prototype.solve = function(locked, fineLevel, alg) {
  var pdict = {};
  var params;
  var _constrs = [];
  var equals = [];

  function getParam(p) {
    var _p = pdict[p.id];
    if (_p === undefined) {
      _p = new TCAD.parametric.Param(p.id, p.get());
      _p._backingParam = p;
      pdict[p.id] = _p;
    }
    return _p;
  }

  var i;
  var p;
  var _p;
  
  for (i = 0; i < this.system.length; ++i) {

    var sdata = this.system[i].getSolveData();
    params = [];
    
    for (p = 0; p < sdata[1].length; ++p) {
      _p = getParam(sdata[1][p]);
      params.push(_p);
    }

    var _constr = TCAD.constraints.create(sdata[0], params, sdata[2]);
    _constrs.push(_constr);
    if (sdata[0] === 'equal') {
      equals.push(this.system[i]);
    }
  }

  var _locked = [];
  var lockedIds = {};
  if (locked !== undefined) {
    for (p = 0; p < locked.length; ++p) {
      _locked[p] = getParam(locked[p]);
      lockedIds[locked[p]] = true;
    }
  }

  TCAD.parametric.solve(_constrs, _locked, fineLevel, alg);

  for (p in pdict) {
    _p = pdict[p];
    _p._backingParam.set(_p.get());
  }


  //Make sure all equal constraints are equal
  for (i = 0; i < equals.length; ++i) {
    var ec = equals[i];
    var master = ec.p1;
    var slave = ec.p2;
    if (lockedIds[master.id] === true) {
      master = ec.p2;
      slave = ec.p1;
      if (lockedIds[master.id] === true) {
        continue;
      }
    }
    slave.set( master.get() );
  }
};

TCAD.TWO.Constraints.Equal = function(p1, p2) {
  this.p1 = p1;
  this.p2 = p2;
};

TCAD.TWO.Constraints.Equal.prototype.getSolveData = function() {
  return ['equal', [this.p1, this.p2], []];
};

TCAD.TWO.Constraints.EqualsTo = function(p, v) {
  this.p = p;
  this.v = v;
};

TCAD.TWO.Constraints.EqualsTo.prototype.getSolveData = function() {
  return ['equalsTo', [this.p], [this.v]];
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


TCAD.TWO.Constraints.P2LDistanceV = function(p, l, d) {
  this.p = p;
  this.l = l;
  this.d = d;
};

TCAD.TWO.Constraints.P2LDistanceV.prototype.getSolveData = function() {
  var params = [];
  this.p.collectParams(params);
  this.l.collectParams(params);
  params.push(this.d);
  return ['P2LDistanceV', params];
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

TCAD.TWO.Constraints.P2PDistanceV = function(p1, p2, d) {
  this.p1 = p1;
  this.p2 = p2;
  this.d = d;
};

TCAD.TWO.Constraints.P2PDistanceV.prototype.getSolveData = function() {
  var params = [];
  this.p1.collectParams(params);
  this.p2.collectParams(params);
  params.push(this.d);
  return ['P2PDistanceV', params];
};