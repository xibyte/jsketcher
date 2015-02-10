TCAD.TWO.Constraints = {};

TCAD.TWO.ParametricManager = function(viewer) {
  this.viewer = viewer;
  this.system = [];
  this.REQUEST_COUNTER = 0;
  this.listeners = [];
};

TCAD.TWO.ParametricManager.prototype.notify = function(event) {
  for (var i = 0; i < this.listeners.length; ++i) {
    var l = this.listeners[i];
    l(event);
  }
};

TCAD.TWO.ParametricManager.prototype.add = function(constr) {
  this.system.push(constr);
  this.solve();
  this.notify();
  this.viewer.refresh();
};

TCAD.TWO.ParametricManager.prototype.remove = function(constr) {
  for (var i = 0; i < this.system.length; ++i) {
    var p = this.system[i];
    if (p.id === constr.id) {
      this.system.splice(i, 1);
      if (p.NAME === 'coi') {
        this.unlinkObjects(p.a, p.b);
      }
      break;
    }
  }
  this.solve();
  this.notify();
  this.viewer.refresh();
};

TCAD.TWO.ParametricManager.prototype.removeConstraintsByObj = function(obj) {
  var ownedParams = [];
  obj.collectParams(ownedParams);
  this.removeConstraintsByParams(ownedParams);
};

TCAD.TWO.ParametricManager.prototype.removeConstraintsByParams = function(ownedParams) {
  var toRemove = [];
  for (var i = 0; i < this.system.length; ++i) {
    var sdataArr = this.system[i].getSolveData();
    for (var j = 0; j < sdataArr.length; j++) {
      var sdata = sdataArr[j];
      var params = sdata[1];
      MAIN:
      for (var j = 0; j < ownedParams.length; ++j) {
        for (var k = 0; k < params.length; ++k) {
          if (ownedParams[j].id === params[k].id) {
            toRemove.push(i);
            break MAIN;
          }
        }
      }
    }
  }

  toRemove.sort();

  for (var i = toRemove.length - 1; i >= 0 ; --i) {
    this.system.splice(  toRemove[i], 1);
  }
  this.notify();
};

TCAD.TWO.ParametricManager.prototype.lock = function(objs) {
  var p = this._fetchPoints(objs);
  for (var i = 0; i < p.length; ++i) {
    this.system.push(new TCAD.TWO.Constraints.Lock(p[i], p[i]));
  }
  this.solve();
  this.notify();
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
  this.notify();
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
      this.notify();
      this.viewer.refresh();
    }
  }
};

TCAD.TWO.ParametricManager.prototype.linkObjects = function(objs) {
  var i;
  var last = objs.length - 1;
  for (i = 0; i < objs.length - 1; ++i) {
    objs[i].x = objs[last].x;
    objs[i].y = objs[last].y;
    var c = new TCAD.TWO.Constraints.Coincident(objs[i], objs[last]);
    this.system.push(c);
  }

  for (i = 0; i < objs.length; ++i) {
    for (var j = 0; j < objs.length; ++j) {
      if (objs[i].id !== objs[j].id) {
        objs[j].linked.push(objs[i]);
      }
    }
  }
  this.notify();
};

TCAD.TWO.ParametricManager.prototype.unlinkObjects = function(a, b) {
  
  function _unlink(a, b) {
    for (var i = 0; i < a.linked.length; ++i) {
      var obj = a.linked[i];
      if (obj.id === b.id) {
        a.linked.splice(i, 1);
        break;
      }
    }
  }
  _unlink(a, b);
  _unlink(b, a);
};

TCAD.TWO.ParametricManager.prototype.coincident = function(objs) {
  if (objs.length == 0) return;
  this.linkObjects(objs);
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
    var sdataArr = this.system[i].getSolveData();
    for (var j = 0; j < sdataArr.length; j++) {
      var sdata = sdataArr[j];
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
  var solver = this.prepare(locked, alg);
  solver.solve(fineLevel);
  solver.sync()
};

TCAD.TWO.ParametricManager.prototype.prepare = function(locked, alg) {

  var pdict = {};
  var params;
  var _constrs = [];
  var equals = [];

  var equalsDict = {};
  var equalsIndex = [];
  var eqcElimination = [];

  function peq(p1, p2) {
    return Math.abs(p1.get() - p2.get()) <= 0.000001
  }
  for (i = 0; i < this.system.length; ++i) {
    var c = this.system[i];
    if (c.NAME === 'coi' && false) { //Disable it
      var found = false;
      //if (!peq(c.p1, c.p2)) continue;
      var p0 = c.p1.id;
      var p1 = c.p2.id;
      equalsDict[p0] = c.p1;
      equalsDict[p1] = c.p2;
      for (ei = 0; ei < equalsIndex.length; ++ei) {
        if (equalsIndex[ei].indexOf(p0) >= 0) {
//          if (!peq(equalsDict[equalsIndex[ei][0]], c.p1) ) break;
          if (equalsIndex[ei].indexOf(p1) < 0) {
            equalsIndex[ei].push(p1);
          }
          found = true;
        } else if (equalsIndex[ei].indexOf(p1) >= 0) {
//          if (!peq(equalsDict[equalsIndex[ei][0]], c.p1) ) break;
          equalsIndex[ei].push(p0);
          found = true;
        }
        if (found) break;
      }
      if (!found) {
        equalsIndex.push([p0, p1]);
      }
      eqcElimination.push(i);
    }
  }

  var equalsElimination = {};
  for (ei = 0; ei < equalsIndex.length; ++ei) {
    var master = equalsIndex[ei][0];
    for (i = 1; i < equalsIndex[ei].length; ++i) {
      equalsElimination[equalsIndex[ei][i]] = master;
    }
  }
  
  function getParam(p) {
    var master = equalsElimination[p.id];
    if (master !== undefined) {
      p = equalsDict[master];
    }
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
  var ei;

  var ii = 0;
  var aux = [];
  for (i = 0; i < this.system.length; ++i) {

    if (eqcElimination[ii] === i) {
      ii++;
      continue;
    }
    
    var sdataArr = this.system[i].getSolveData();
    for (var j = 0; j < sdataArr.length; j++) {
      var sdata = sdataArr[j];
      params = [];
      
      for (p = 0; p < sdata[1].length; ++p) {
        _p = getParam(sdata[1][p]);
        params.push(_p);
        if (_p._backingParam.obj !== undefined && !!_p._backingParam.obj.aux) {
          aux.push(_p);
        }
      }
  
      var _constr = TCAD.constraints.create(sdata[0], params, sdata[2]);
      _constrs.push(_constr);
      if (sdata[0] === 'equal') {
        equals.push(this.system[i]);
      }
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
  
  var lockedValues = [];
  var solver = TCAD.parametric.prepare(_constrs, _locked, aux, alg);
  function solve(fineLevel) {
    if (_locked.length != 0) {
      for (p = 0; p < locked.length; ++p) {
        lockedValues[p] = locked[p].get() ;
      }
      solver.updateLock(lockedValues);
    }
    for (p in pdict) {
      _p = pdict[p];
      _p.set(_p._backingParam.get());
    }
    solver.solveSystem(fineLevel);
  }
  var viewer = this.viewer;
  function sync() {
    var rollback = [];
    for (p in pdict) {
      _p = pdict[p];
      rollback.push([_p._backingParam, _p._backingParam.get()]);
      _p._backingParam.set(_p.get());
    }

    //Make sure all coincident constraints are equal
    var rollbackCo = [];
    for (ei = 0; ei < equalsIndex.length; ++ei) {
      var master = equalsDict[ equalsIndex[ei][0]];
      for (i = 1; i < equalsIndex[ei].length; ++i) {
        var slave = equalsDict[equalsIndex[ei][i]];
        rollbackCo.push([slave.id, slave.get()]); 
        slave.set(master.get());
      }
    }
    
    if (false && !viewer.validateGeom()) { //Disabled
      for (i = 0; i < rollback.length; ++i) {
        rollback[i][0].set(rollback[i][0]);
      }
      for (i = 0; i < rollbackCo.length; ++i) {
        rollbackCo[i][0].set(rollbackCo[i][0]);
      }
    }
  }
  
  solver.solve = solve;
  solver.sync = sync;
  return solver; 
};


TCAD.TWO.Constraints.Coincident = function(a, b) {
  this.a = a;
  this.b = b;
};

TCAD.TWO.Constraints.Coincident.prototype.NAME = 'coi';

TCAD.TWO.Constraints.Coincident.prototype.getSolveData = function() {
  return [
    ['equal', [this.a._x, this.b._x], []],
    ['equal', [this.a._y, this.b._y], []]
  ];
};

TCAD.TWO.Constraints.Lock = function(p, c) {
  this.p = p;
  this.c = c;
};

TCAD.TWO.Constraints.Lock.prototype.NAME = 'lock';

TCAD.TWO.Constraints.Lock.prototype.getSolveData = function() {
  return [
    ['equalsTo', [this.p._x, this.c.x], []],
    ['equalsTo', [this.p._y, this.c.y], []]
  ];
};

TCAD.TWO.Constraints.Parallel = function(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Parallel.prototype.NAME = 'parallel';

TCAD.TWO.Constraints.Parallel.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return [[this.NAME, params, []]];
};

TCAD.TWO.Constraints.Perpendicular = function(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Perpendicular.prototype.NAME = 'perpendicular';

TCAD.TWO.Constraints.Perpendicular.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return [[this.NAME, params, []]];
};

TCAD.TWO.Constraints.P2LDistance = function(p, l, d) {
  this.p = p;
  this.l = l;
  this.d = d;
};

TCAD.TWO.Constraints.P2LDistance.prototype.NAME = 'P2LDistance';

TCAD.TWO.Constraints.P2LDistance.prototype.getSolveData = function() {
  var params = [];
  this.p.collectParams(params);
  this.l.collectParams(params);
  return [[this.NAME, params, [this.d]]];
};


TCAD.TWO.Constraints.P2LDistanceV = function(p, l, d) {
  this.p = p;
  this.l = l;
  this.d = d;
};

TCAD.TWO.Constraints.P2LDistanceV.prototype.NAME = 'P2LDistanceV';

TCAD.TWO.Constraints.P2LDistanceV.prototype.getSolveData = function() {
  var params = [];
  this.p.collectParams(params);
  this.l.collectParams(params);
  params.push(this.d);
  return [[this.NAME, params]];
};


TCAD.TWO.Constraints.P2PDistance = function(p1, p2, d) {
  this.p1 = p1;
  this.p2 = p2;
  this.d = d;
};

TCAD.TWO.Constraints.P2PDistance.prototype.NAME = 'P2PDistance';

TCAD.TWO.Constraints.P2PDistance.prototype.getSolveData = function() {
  var params = [];
  this.p1.collectParams(params);
  this.p2.collectParams(params);
  return [[this.NAME, params, [this.d]]];
};

TCAD.TWO.Constraints.P2PDistanceV = function(p1, p2, d) {
  this.p1 = p1;
  this.p2 = p2;
  this.d = d;
};

TCAD.TWO.Constraints.P2PDistanceV.prototype.NAME = 'P2PDistanceV';

TCAD.TWO.Constraints.P2PDistanceV.prototype.getSolveData = function() {
  var params = [];
  this.p1.collectParams(params);
  this.p2.collectParams(params);
  params.push(this.d);
  return [[this.NAME, params]];
};