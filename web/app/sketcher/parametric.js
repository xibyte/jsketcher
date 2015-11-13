TCAD.TWO.Constraints = {};
TCAD.EQUALS_ELIMINATION_ENABLED = true;

/** @constructor */
TCAD.TWO.SubSystem = function() {
  this.alg = 1;
  this.error = 0;
  this.reduce = false;
  this.constraints = [];
};

/** @constructor */
TCAD.TWO.ParametricManager = function(viewer) {
  this.viewer = viewer;
  this.subSystems = [];
  this.listeners = [];
};

TCAD.TWO.ParametricManager.prototype.notify = function(event) {
  for (var i = 0; i < this.listeners.length; ++i) {
    var l = this.listeners[i];
    l(event);
  }
};

TCAD.TWO.ParametricManager.prototype.findComponents = function(constr) {
  if (this.subSystems.length === 0) {
    this.subSystems.push(new TCAD.TWO.SubSystem());
  }
  return [0];  
};

TCAD.TWO.ParametricManager.prototype.tune = function(subSystem) {
  
};

TCAD.TWO.ParametricManager.prototype._add = function(constr) {
  var subSystemIds = this.findComponents(constr);
  var subSystem; 
  switch (subSystemIds.length) {
    case 0:
      subSystem = new TCAD.TWO.SubSystem();
      this.subSystems.push(subSystem);
      break;
    case 1:
      subSystem = this.subSystems[subSystemIds[0]];
      break;
    default:
      subSystem = this.subSystems[subSystemIds[0]];
      for (var i = 1; i < subSystemIds.length; i++) {
        var toMerge = subSystemIds[i];
        for (var j = 0; j < toMerge.constraints.length; j++) {
          subSystem.push(toMerge.constraints[j]);
        }
      }
    break;  
  }
  subSystem.constraints.push(constr);
  return subSystem;
};

TCAD.TWO.ParametricManager.prototype.checkRedundancy = function (subSystem, constr) {
  var solver = this.prepareForSubSystem([], subSystem.constraints);
  if (solver.diagnose().conflict) {
    alert("Most likely this "+constr.NAME + " constraint is CONFLICTING!")
  }
};

TCAD.TWO.ParametricManager.prototype.refresh = function() {
  this.solve();
  this.notify();
  this.viewer.refresh();
};

TCAD.TWO.ParametricManager.prototype.add = function(constr) {
  this.viewer.historyManager.checkpoint();
  var subSystem = this._add(constr)
  this.checkRedundancy(subSystem, constr);
  this.refresh();
};

TCAD.TWO.ParametricManager.prototype.addAll = function(constrs) {
  for (var i = 0; i < constrs.length; i++) {
    var subSystem = this._add(constrs[i]);
    this.checkRedundancy(subSystem, constrs[i]);
  }
  this.refresh();
};

TCAD.TWO.ParametricManager.prototype.remove = function(constr) {
  this.viewer.historyManager.checkpoint();
  for (var j = 0; j < this.subSystems.length; j++) {
    var sub = this.subSystems[j];
    for (var i = 0; i < sub.constraints.length; ++i) {
      var p = sub.constraints[i];
      if (p === constr) {
        sub.constraints.splice(i, 1);
        if (p.NAME === 'coi') {
          this.unlinkObjects(p.a, p.b);
        }
        break;
      }
    }
  }
  this.refresh();
};

TCAD.TWO.ParametricManager.prototype.removeConstraintsByObj = function(obj) {
  var ownedParams = [];
  obj.collectParams(ownedParams);
  this.removeConstraintsByParams(ownedParams);
};

TCAD.TWO.ParametricManager.prototype.removeConstraintsByParams = function(ownedParams) {
  for (var s = 0; s < this.subSystems.length; s++) {
    var toRemove = [];
    var sub = this.subSystems[s];
    for (var i = 0; i < sub.constraints.length; ++i) {
      var sdataArr = sub.constraints[i].getSolveData();
      MAIN:
      for (var j = 0; j < sdataArr.length; j++) {
        var sdata = sdataArr[j];
        var params = sdata[1];
        for (var oi = 0; oi < ownedParams.length; ++oi) {
          for (var k = 0; k < params.length; ++k) {
            if (ownedParams[oi].id === params[k].id) {
              toRemove.push(i);
              break MAIN;
            }
          }
        }
      }
    }
    toRemove.sort();
  
    for (var i = toRemove.length - 1; i >= 0 ; --i) {
      sub.constraints.splice(  toRemove[i], 1);
    }
  }

  this.notify();
};

TCAD.TWO.ParametricManager.prototype.lock = function(objs) {
  var p = this._fetchPoints(objs);
  for (var i = 0; i < p.length; ++i) {
    this._add(new TCAD.TWO.Constraints.Lock(p[i], { x : p[i].x, y : p[i].y} ));
  }
  this.refresh();
};

TCAD.TWO.ParametricManager.prototype.vertical = function(objs) {
  this.add(new TCAD.TWO.Constraints.Vertical(this._fetchLine(objs)));
};

TCAD.TWO.ParametricManager.prototype.horizontal = function(objs) {
  this.add(new TCAD.TWO.Constraints.Horizontal(this._fetchLine(objs)));
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
  this.add(new TCAD.TWO.Constraints.Tangent( arc, line));
};

TCAD.TWO.ParametricManager.prototype.rr = function(arcs) {
  var prev = arcs[0];
  for (var i = 1; i < arcs.length; ++i) {
    this._add(new TCAD.TWO.Constraints.RR(prev, arcs[i]));
    prev = arcs[i];
  }
  this.refresh();
};

TCAD.TWO.ParametricManager.prototype.ll = function(lines) {
  this.add(new TCAD.TWO.Constraints.LL(lines[0], lines[1]));
};

TCAD.TWO.ParametricManager.prototype.entityEquality = function(objs) {
  var arcs, lines = undefined;
  try {
    arcs = this._fetchArkCirc(objs, 2);
  } catch (e1) {
    try {
       lines = this._fetchTwoLines(objs);
    } catch (e2) {
      throw e1 + "\n" + e2;
    }
  }
  if (!!arcs) this.rr(arcs);
  if (!!lines) this.ll(lines);
};

TCAD.TWO.ParametricManager.prototype.p2lDistance = function(objs, promptCallback) {
  var pl = this._fetchPointAndLine(objs);

  var target = pl[0];
  var segment = pl[1];
  
  var ex = new TCAD.Vector(-(segment.b.y - segment.a.y), segment.b.x - segment.a.x).normalize();
  var distance = Math.abs(ex.dot(new TCAD.Vector(segment.a.x - target.x, segment.a.y - target.y)));

  var promptDistance = TCAD.TWO.utils.askNumber(TCAD.TWO.Constraints.P2LDistance.prototype.SettableFields.d, distance.toFixed(2), promptCallback);

  if (promptDistance != null) {
    this.add(new TCAD.TWO.Constraints.P2LDistance(target, segment, promptDistance));
  }
};

TCAD.TWO.ParametricManager.prototype.pointOnLine = function(objs) {
  var pl = this._fetchPointAndLine(objs);
  var target = pl[0];
  var segment = pl[1];
  this.add(new TCAD.TWO.Constraints.PointOnLine(target, segment));
};

TCAD.TWO.utils.constRef = function(value) {
  return function() {
    return value;    
  };
};

TCAD.TWO.ParametricManager.prototype.p2pDistance = function(objs, promptCallback) {
  var p = this._fetchTwoPoints(objs);
  var distance = new TCAD.Vector(p[1].x - p[0].x, p[1].y - p[0].y).length();
  var promptDistance = TCAD.TWO.utils.askNumber(TCAD.TWO.Constraints.P2PDistance.prototype.SettableFields.d, distance.toFixed(2), promptCallback);

  if (promptDistance != null) {
    this.add(new TCAD.TWO.Constraints.P2PDistance(p[0], p[1], promptDistance));
  }
};

TCAD.TWO.utils.askNumber = function(promptText, initValue, promptCallback) {
  var promptValue = promptCallback(promptText, initValue);
  if (promptValue != null) {
    promptValue = Number(promptValue);
    if (promptValue == promptValue) { // check for NaN
      return promptValue;
    }
  }
  return null;
};

TCAD.TWO.ParametricManager.prototype.radius = function(objs, promptCallback) {
  var arcs = this._fetchArkCirc(objs, 1);
  var radius = arcs[0].r.get();
  var promptDistance = TCAD.TWO.utils.askNumber(TCAD.TWO.Constraints.Radius.prototype.SettableFields.d, radius.toFixed(2), promptCallback);
  if (promptDistance != null) {
    for (var i = 0; i < arcs.length; ++i) {
      this._add(new TCAD.TWO.Constraints.Radius(arcs[i], promptDistance));
    }
    this.refresh();
  }
};

TCAD.TWO.ParametricManager.prototype.linkObjects = function(objs) {
  var i;
  var masterIdx = -1;
  for (i = 0; i < objs.length; ++i) {
    if (TCAD.TWO.ParametricManager.isAux(objs[i])) {
      if (masterIdx !== -1) {
        throw "not allowed to have a coincident constraint between two or more auxiliary objects";
      }
      masterIdx = i;
    }
  }
  if (masterIdx === -1) masterIdx = objs.length - 1;


  for (i = 0; i < objs.length; ++i) {
    if (i === masterIdx) continue;
    objs[i].x = objs[masterIdx].x;
    objs[i].y = objs[masterIdx].y;
    var c = new TCAD.TWO.Constraints.Coincident(objs[i], objs[masterIdx]);
    this._add(c);
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

TCAD.TWO.ParametricManager.prototype.getSolveData = function() {
  var sdata = []; 
  for (var i = 0; i < this.subSystems.length; i++) {
    this.__getSolveData(this.subSystems[i].constraints, sdata);
  }
  return sdata;
};

TCAD.TWO.ParametricManager.prototype.__getSolveData = function(constraints, out) {
  for (var i = 0; i < constraints.length; ++i) {
    var constraint = constraints[i];
    var data = constraint.getSolveData();
    for (var j = 0; j < data.length; ++j) {
      data[j].push(constraint.reducible !== undefined);
      out.push(data[j]);
    }
  }
  return out;
};

TCAD.TWO.ParametricManager.prototype.solve = function() {
  var solver = this.prepare([]);
  solver.solve(false);
  solver.sync();
};

TCAD.TWO.ParametricManager.prototype.solveWithLock = function(lock) {
  var solver = this.prepare(lock);
  solver.solve(false);
  solver.sync();
};

TCAD.TWO.ParametricManager.prototype.prepare = function(locked, extraConstraints) {
  return this._prepare(locked, this.subSystems, extraConstraints);
};

TCAD.TWO.ParametricManager.prototype._prepare = function(locked, subSystems, extraConstraints) {
  var solvers = [];
  for (var i = 0; i < subSystems.length; i++) {
    solvers.push(this.prepareForSubSystem(locked, subSystems[i].constraints, extraConstraints));
  }
  if (subSystems.length == 0 && locked.length != 0) {
    solvers.push(this.prepareForSubSystem(locked, [], extraConstraints));
  }
  return {
    solvers : solvers,
    
    solve : function(rough) {
      for (var i = 0; i < solvers.length; i++) {
        var alg =  i < subSystems.length ? subSystems[i].alg : 1;
        var res = solvers[i].solve(rough, alg);
        if (res.returnCode !== 1) {
          alg = alg == 1 ? 2 : 1;
          //if (solvers[i].solve(rough, alg).returnCode == 1) {
            //subSystems[i].alg = alg;
          //}
        }
      }
    },
    
    sync : function() {
      for (var i = 0; i < solvers.length; i++) {
        solvers[i].sync();
      }
    },

    updateLock : function(values) {
      for (var i = 0; i < solvers.length; i++) {
        solvers[i].updateLock(values);
      }
    }
  }
};

TCAD.TWO.ParametricManager.isAux = function(obj) {
  while (!!obj) {
    if (!!obj.aux) {
      return true;
    }
    obj = obj.parent;
  }
  return false;
};

TCAD.TWO.ParametricManager.findAuxIndices = function(system) {
  var auxParams = [];
  for (var i = 0; i < system.length; ++i) {
    for (var p = 0; p < system[i][1].length; ++p) {
      var parameter = system[i][1][p];
      if (parameter.obj !== undefined) {
        parameter.__aux = TCAD.TWO.ParametricManager.isAux(parameter.obj);
        if (parameter.__aux) {
          auxParams.push(parameter);
        }
      }
    }
  }
  return auxParams;
};

TCAD.TWO.ParametricManager.__toId = function(v) {
  return v.id;
};

TCAD.TWO.ParametricManager.prototype.prepareForSubSystem = function(locked, subSystemConstraints, extraConstraints) {

  var pdict = {};
  var params;
  var _constrs = [];

  var equalsDict = {};
  var equalsIndex = [];
  var eqcElimination = {};

  var lockedIds = locked.map(function(p) {return p.id});

  var system = [];
  this.__getSolveData(subSystemConstraints, system);
  if (!!extraConstraints) this.__getSolveData(extraConstraints, system);

//  system.sort(function(a, b){
//    a = a[0] === 'equal' ? 1 : 2;
//    b = b[0] === 'equal' ? 1 : 2;
//    return a - b;
//  });

  var auxParams = TCAD.TWO.ParametricManager.findAuxIndices(system);

  var tuples = [];
  if (TCAD.EQUALS_ELIMINATION_ENABLED) {
    var c, pi, paramIndex = {};
    
    function intersect(array1, array2) {
      if (!array1 || !array2) return false;
      return array1.filter(function(n) {
        return array2.indexOf(n) != -1
      }).length != 0;
    }
    
    for (i = 0; i < system.length; ++i) {
      c = system[i];
      if (c[3] !== true) {
        var sameParams = {};
        for (pi = 0; pi < c[1].length; pi++) {
          var param = c[1][pi];
          var paramConstrs = paramIndex[param.id];
          if (paramConstrs === undefined) {
            paramConstrs = [];
            paramIndex[param.id] = paramConstrs;
          }
          paramConstrs.push(i);
        }
      }
    }

    for (i = 0; i < system.length; ++i) {
      c = system[i];
      if (c[3] === true) { //Reduce flag
        
        var cp1 = c[1][0];
        var cp2 = c[1][1];
        var p0 = cp1.id;
        var p1 = cp2.id;

        var assoc0 = paramIndex[p0];
        var assoc1 = paramIndex[p1];
        if (intersect(assoc0, assoc1)) {
          continue;
        }
        equalsDict[p0] = cp1;
        equalsDict[p1] = cp2;
        tuples.push([p0, p1]);
        eqcElimination[i] = true;
      }
    }
  }

  function _check(index, p0, p1) {
    var exists = index.indexOf(p0) >= 0;
    if (exists) {
      if (index.indexOf(p1) < 0) {
        index.push(p1);
      }
    }
    return exists;
  }

  function _merge(arr1, arr2) {
    for (var i = 0; i < arr2.length; ++i) {
      if (arr1.indexOf(arr2[i]) < 0) {
        arr1.push(arr2[i]);
      }
    }
  }

  function _join(tuples, index) {

    var tuple = tuples[index];
    tuples[index] = null;

    for (var i = 0; i < tuples.length; ++i) {
      var t1 = tuples[i];
      if (t1 == null) continue;
      if (tuple.indexOf(t1[0]) >= 0 || tuple.indexOf(t1[1]) >= 0) {
        _join(tuples, i);
        _merge(tuple, t1);
      }
    }
  }
  var readOnlyParams = auxParams.concat(locked);
  for (var i = 0; i < tuples.length; ++i) {
    var tuple = tuples[i];
    if (tuple != null) {
      equalsIndex.push(tuple);
      _join(tuples, i)
      for (var mi = 0; mi < readOnlyParams.length; ++mi) {
        var master = readOnlyParams[mi];
        var masterIdx = tuple.indexOf(master.id);
        if (masterIdx >= 0) {
          var tmp = tuple[0];
          tuple[0] = tuple[masterIdx];
          tuple[masterIdx] = tmp;
          break;
        }
      }
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
      if (p.__cachedParam__ === undefined) {
        _p = new TCAD.parametric.Param(p.id, p.get(), !!p.__aux);
        p.__cachedParam__ = _p;
      } else {
        _p = p.__cachedParam__;
        _p.reset(p.get());
      }

      _p._backingParam = p;
      pdict[p.id] = _p;
    }
    return _p;
  }

  var i;
  var p;
  var _p;
  var ei;

  var aux = [];
  for (i = 0; i < system.length; ++i) {

    if (eqcElimination[i] === true) continue;
    
    var sdata = system[i];
    params = [];

    for (p = 0; p < sdata[1].length; ++p) {
      var param = sdata[1][p];
      _p = getParam(param);
      params.push(_p);
      if (param.__aux) aux.push(_p);
    }

    var _constr = TCAD.constraints.create(sdata[0], params, sdata[2]);
    _constrs.push(_constr);
  }

  var _locked = [];
  if (locked !== undefined) {
    for (p = 0; p < locked.length; ++p) {
      _locked[p] = getParam(locked[p]);
    }
  }
  
  var solver = TCAD.parametric.prepare(_constrs, _locked, aux);
  function solve(rough, alg) {
    for (p in pdict) {
      _p = pdict[p];
      _p.set(_p._backingParam.get());
    }
    return solver.solveSystem(rough, alg);
  }
  var viewer = this.viewer;
  function sync() {
    for (p in pdict) {
      _p = pdict[p];
      if (!!_p._backingParam.__aux) continue;
      _p._backingParam.set(_p.get());
    }

    //Make sure all coincident constraints are equal
    for (ei = 0; ei < equalsIndex.length; ++ei) {
      var master = equalsDict[ equalsIndex[ei][0]];
      for (i = 1; i < equalsIndex[ei].length; ++i) {
        var slave = equalsDict[equalsIndex[ei][i]];
        slave.set(master.get());
      }
    }
  }
  
  solver.solve = solve;
  solver.sync = sync;
  return solver; 
};

TCAD.TWO.Constraints.Factory = {};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Coincident = function(a, b) {
  this.a = a;
  this.b = b;
  a.linked.push(b);
  b.linked.push(a);
};

TCAD.TWO.Constraints.Coincident.prototype.NAME = 'coi';
TCAD.TWO.Constraints.Coincident.prototype.UI_NAME = 'Coincident';
TCAD.TWO.Constraints.Coincident.prototype.reducible = true;

TCAD.TWO.Constraints.Coincident.prototype.getSolveData = function() {
  return [
    ['equal', [this.a._x, this.b._x], []],
    ['equal', [this.a._y, this.b._y], []]
  ];
};

TCAD.TWO.Constraints.Coincident.prototype.serialize = function() {
  return [this.NAME, [this.a.id, this.b.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Coincident.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Coincident(refs(data[0]), refs(data[1]));  
};

TCAD.TWO.Constraints.Coincident.prototype.getObjects = function() {
  return [this.a, this.b];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Lock = function(p, c) {
  this.p = p;
  this.c = c;
};

TCAD.TWO.Constraints.Lock.prototype.NAME = 'lock';
TCAD.TWO.Constraints.Lock.prototype.UI_NAME = 'Lock';

TCAD.TWO.Constraints.Lock.prototype.getSolveData = function() {
  return [
    ['equalsTo', [this.p._x], [this.c.x]],
    ['equalsTo', [this.p._y], [this.c.y]]
  ];
};

TCAD.TWO.Constraints.Lock.prototype.serialize = function() {
  return [this.NAME, [this.p.id, this.c]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Lock.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Lock(refs(data[0]), data[1]);
};


TCAD.TWO.Constraints.Lock.prototype.getObjects = function() {
  return [this.p];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Parallel = function(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Parallel.prototype.NAME = 'parallel';
TCAD.TWO.Constraints.Parallel.prototype.UI_NAME = 'Parallel';

TCAD.TWO.Constraints.Parallel.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return [[this.NAME, params, []]];
};

TCAD.TWO.Constraints.Parallel.prototype.serialize = function() {
  return [this.NAME, [this.l1.id, this.l2.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Parallel.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Parallel(refs(data[0]), refs(data[1]));
};

TCAD.TWO.Constraints.Parallel.prototype.getObjects = function() {
  return [this.l1, this.l2];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Perpendicular = function(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
};

TCAD.TWO.Constraints.Perpendicular.prototype.NAME = 'perpendicular';
TCAD.TWO.Constraints.Perpendicular.prototype.UI_NAME = 'Perpendicular';

TCAD.TWO.Constraints.Perpendicular.prototype.getSolveData = function() {
  var params = [];
  this.l1.collectParams(params);
  this.l2.collectParams(params);
  return [[this.NAME, params, []]];
};

TCAD.TWO.Constraints.Perpendicular.prototype.serialize = function() {
  return [this.NAME, [this.l1.id, this.l2.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Perpendicular.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Perpendicular(refs(data[0]), refs(data[1]));
};

TCAD.TWO.Constraints.Perpendicular.prototype.getObjects = function() {
  return [this.l1, this.l2];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.P2LDistance = function(p, l, d) {
  this.p = p;
  this.l = l;
  this.d = d;
};

TCAD.TWO.Constraints.P2LDistance.prototype.NAME = 'P2LDistance';
TCAD.TWO.Constraints.P2LDistance.prototype.UI_NAME = 'Distance P & L';

TCAD.TWO.Constraints.P2LDistance.prototype.getSolveData = function() {
  var params = [];
  this.p.collectParams(params);
  this.l.collectParams(params);
  return [[this.NAME, params, [this.d]]];
};

TCAD.TWO.Constraints.P2LDistance.prototype.serialize = function() {
  return [this.NAME, [this.p.id, this.l.id, this.d]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.P2LDistance.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.P2LDistance(refs(data[0]), refs(data[1]), data[2]);
};

TCAD.TWO.Constraints.P2LDistance.prototype.getObjects = function() {
  return [this.p, this.l];
};

TCAD.TWO.Constraints.P2LDistance.prototype.SettableFields = {'d' : "Enter the distance"};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.P2LDistanceV = function(p, l, d) {
  this.p = p;
  this.l = l;
  this.d = d;
  this.aux = true;
};

TCAD.TWO.Constraints.P2LDistanceV.prototype.NAME = 'P2LDistanceV';
TCAD.TWO.Constraints.P2LDistanceV.prototype.UI_NAME = 'Distance P & L';

TCAD.TWO.Constraints.P2LDistanceV.prototype.getSolveData = function() {
  var params = [];
  this.p.collectParams(params);
  this.l.collectParams(params);
  params.push(this.d);
  return [[this.NAME, params]];
};

// We don't serialize auxiliary constraints
//
//TCAD.TWO.Constraints.P2LDistanceV.prototype.serialize = function() {
//  return [this.NAME, [this.p.id, this.l.id, this.d.id]];
//};
//
//TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.P2LDistanceV.prototype.NAME] = function(refs, data) {
//  return new TCAD.TWO.Constraints.P2LDistanceV(refs(data[0]), refs(data[1]), refs(data[2]));
//};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.P2PDistance = function(p1, p2, d) {
  this.p1 = p1;
  this.p2 = p2;
  this.d = d;
};

TCAD.TWO.Constraints.P2PDistance.prototype.NAME = 'P2PDistance';
TCAD.TWO.Constraints.P2PDistance.prototype.UI_NAME = 'Distance Points';

TCAD.TWO.Constraints.P2PDistance.prototype.getSolveData = function() {
  var params = [];
  this.p1.collectParams(params);
  this.p2.collectParams(params);
  return [[this.NAME, params, [this.d]]];
};

TCAD.TWO.Constraints.P2PDistance.prototype.serialize = function() {
  return [this.NAME, [this.p1.id, this.p2.id, this.d]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.P2PDistance.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.P2PDistance(refs(data[0]), refs(data[1]), data[2]);
};

TCAD.TWO.Constraints.P2PDistance.prototype.getObjects = function() {
  return [this.p1, this.p2];
};

TCAD.TWO.Constraints.P2PDistance.prototype.SettableFields = {'d' : "Enter the distance"};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.P2PDistanceV = function(p1, p2, d) {
  this.p1 = p1;
  this.p2 = p2;
  this.d = d;
  this.aux = true;
};

TCAD.TWO.Constraints.P2PDistanceV.prototype.NAME = 'P2PDistanceV';
TCAD.TWO.Constraints.P2PDistanceV.prototype.UI_NAME = 'Distance Points';

TCAD.TWO.Constraints.P2PDistanceV.prototype.getSolveData = function() {
  var params = [];
  this.p1.collectParams(params);
  this.p2.collectParams(params);
  params.push(this.d);
  return [[this.NAME, params]];
};

// We don't serialize auxiliary constraints
//
//TCAD.TWO.Constraints.P2PDistanceV.prototype.serialize = function() {
//  return [this.NAME, [this.p1.id, this.p2.id, this.d.id]];
//};
//
//TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.P2PDistanceV.prototype.NAME] = function(refs, data) {
//  return new TCAD.TWO.Constraints.P2PDistanceV(refs(data[0]), refs(data[1]), refs(data[2]));
//};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Radius = function(arc, d) {
  this.arc = arc;
  this.d = d;
};

TCAD.TWO.Constraints.Radius.prototype.NAME = 'Radius';
TCAD.TWO.Constraints.Radius.prototype.UI_NAME = 'Radius Value';


TCAD.TWO.Constraints.Radius.prototype.getSolveData = function() {
  return [['equalsTo', [this.arc.r], [this.d]]];
};

TCAD.TWO.Constraints.Radius.prototype.serialize = function() {
  return [this.NAME, [this.arc.id, this.d]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Radius.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Radius(refs(data[0]), data[1]);
};

TCAD.TWO.Constraints.Radius.prototype.getObjects = function() {
  return [this.arc];
};

TCAD.TWO.Constraints.Radius.prototype.SettableFields = {'d' : "Enter the radius value"};

// ------------------------------------------------------------------------------------------------------------------ // 

/** @constructor */
TCAD.TWO.Constraints.RR = function(arc1, arc2) {
  this.arc1 = arc1;
  this.arc2 = arc2;
};

TCAD.TWO.Constraints.RR.prototype.NAME = 'RR';
TCAD.TWO.Constraints.RR.prototype.UI_NAME = 'Radius Equality';
//TCAD.TWO.Constraints.RR.prototype.reducible = true;


TCAD.TWO.Constraints.RR.prototype.getSolveData = function() {
  return [['equal', [this.arc1.r, this.arc2.r], []]];
};

TCAD.TWO.Constraints.RR.prototype.serialize = function() {
  return [this.NAME, [this.arc1.id, this.arc2.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.RR.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.RR(refs(data[0]), refs(data[1]));
};

TCAD.TWO.Constraints.RR.prototype.getObjects = function() {
  return [this.arc1, this.arc2];
};

// ------------------------------------------------------------------------------------------------------------------ // 

/** @constructor */
TCAD.TWO.Constraints.LL = function(line1, line2) {
  this.line1 = line1;
  this.line2 = line2;
  this.length = new TCAD.TWO.Ref(TCAD.math.distanceAB(line1.a, line1.b));
};

TCAD.TWO.Constraints.LL.prototype.NAME = 'LL';
TCAD.TWO.Constraints.LL.prototype.UI_NAME = 'Lines Equality';

TCAD.TWO.Constraints.LL.prototype.getSolveData = function() {
  var params1 = [];
  var params2 = [];
  this.line1.collectParams(params1);
  this.line2.collectParams(params2);
  params1.push(this.length);
  params2.push(this.length);
  return [
    ['P2PDistanceV', params1, []],
    ['P2PDistanceV', params2, []]
  ];
};

TCAD.TWO.Constraints.LL.prototype.serialize = function() {
  return [this.NAME, [this.line1.id, this.line2.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.LL.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.LL(refs(data[0]), refs(data[1]));
};

TCAD.TWO.Constraints.LL.prototype.getObjects = function() {
  return [this.line1, this.line2];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Vertical = function(line) {
  this.line = line;
};

TCAD.TWO.Constraints.Vertical.prototype.NAME = 'Vertical';
TCAD.TWO.Constraints.Vertical.prototype.UI_NAME = 'Vertical';
//TCAD.TWO.Constraints.Vertical.prototype.reducible = true;

TCAD.TWO.Constraints.Vertical.prototype.getSolveData = function() {
  return [['equal', [this.line.a._x, this.line.b._x], []]];
};

TCAD.TWO.Constraints.Vertical.prototype.serialize = function() {
  return [this.NAME, [this.line.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Vertical.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Vertical(refs(data[0]));
};

TCAD.TWO.Constraints.Vertical.prototype.getObjects = function() {
  return [this.line];
};

// ------------------------------------------------------------------------------------------------------------------ // 

/** @constructor */
TCAD.TWO.Constraints.Horizontal = function(line) {
  this.line = line;
};

TCAD.TWO.Constraints.Horizontal.prototype.NAME = 'Horizontal';
TCAD.TWO.Constraints.Horizontal.prototype.UI_NAME = 'Horizontal';
//TCAD.TWO.Constraints.Horizontal.prototype.reducible = true;

TCAD.TWO.Constraints.Horizontal.prototype.getSolveData = function() {
  return [['equal', [this.line.a._y, this.line.b._y], []]];
};

TCAD.TWO.Constraints.Horizontal.prototype.serialize = function() {
  return [this.NAME, [this.line.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Horizontal.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Horizontal(refs(data[0]));
};

TCAD.TWO.Constraints.Horizontal.prototype.getObjects = function() {
  return [this.line];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.Tangent = function(arc, line) {
  this.arc = arc;
  this.line = line;
};

TCAD.TWO.Constraints.Tangent.prototype.NAME = 'Tangent';
TCAD.TWO.Constraints.Tangent.prototype.UI_NAME = 'Tangent';

TCAD.TWO.Constraints.Tangent.prototype.getSolveData = function() {
  var params = [];
  this.arc.c.collectParams(params);
  this.line.collectParams(params);
  params.push(this.arc.r);
  return [['P2LDistanceV', params, []]];
};

TCAD.TWO.Constraints.Tangent.prototype.serialize = function() {
  return [this.NAME, [this.arc.id, this.line.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.Tangent.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.Tangent(refs(data[0]), refs(data[1]));
};

TCAD.TWO.Constraints.Tangent.prototype.getObjects = function() {
  return [this.arc, this.line];
};

// ------------------------------------------------------------------------------------------------------------------ //

/** @constructor */
TCAD.TWO.Constraints.PointOnLine = function(point, line) {
  this.point = point;
  this.line = line;
};

TCAD.TWO.Constraints.PointOnLine.prototype.NAME = 'PointOnLine';
TCAD.TWO.Constraints.PointOnLine.prototype.UI_NAME = 'Point On Line';

TCAD.TWO.Constraints.PointOnLine.prototype.getSolveData = function() {
  var params = [];
  this.point.collectParams(params);
  this.line.collectParams(params);
  return [['P2LDistance', params, [0]]];
};

TCAD.TWO.Constraints.PointOnLine.prototype.serialize = function() {
  return [this.NAME, [this.point.id, this.line.id]];
};

TCAD.TWO.Constraints.Factory[TCAD.TWO.Constraints.PointOnLine.prototype.NAME] = function(refs, data) {
  return new TCAD.TWO.Constraints.PointOnLine(refs(data[0]), refs(data[1]));
};

TCAD.TWO.Constraints.PointOnLine.prototype.getObjects = function() {
  return [this.point, this.line];
};

// ------------------------------------------------------------------------------------------------------------------ //
