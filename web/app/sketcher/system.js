import {addToSetInMap, removeFromSetInMap, removeInPlace} from 'gems/iterables';
import {ParametricManager} from './parametric';


let SUB_SYSTEM_ORDER = 0;

class SubSystem {
  constructor() {
    this.alg = 1;
    this.error = 0;
    this.reduce = false;
    this.constraints = [];
    this.dependencies = [];
    this.nativeParams = new Set();

    this._internaOrder = SUB_SYSTEM_ORDER++;
  }

  mergeWith(other) {
    other.constraints.forEach(c => this.constraints.push(c));
    other.dependencies.forEach(d => {
      if (this.dependencies.indexOf(d) === -1) {
        this.dependencies.push(d);
      }
    });
    other.nativeParams.forEach(p => this.nativeParams.add(p));
  }

  prepare() {

  }
}

class Index {

  constructor() {
    this.constraints = [];
    this.paramToConstraintsIndex = new Map();
    this.paramToConstraintsGraph = new Map();
    this.generatorConstraints = [];
    this.generatedParams = new Map();
  }

  _reset() {
    this.constraints = [];
    this.paramToConstraintsIndex.clear();
    this.paramToConstraintsGraph.clear();
    this.generatorConstraints = [];
    this.generatedParams.clear();
  }
  
  _pushConstraint(constr) {
    this.constraints.push(constr);
    visitParams(constr, true, p => addToSetInMap(this.paramToConstraintsGraph, p, constr));
    visitParams(constr, false, p => addToSetInMap(this.paramToConstraintsIndex, p, constr));
    if (constr.GENERATOR) {
      this.generatorConstraints.push(constr);
      constr.visitGeneratedParams(p => this.generatedParams.set(p, constr));
    }
  }

  _popConstraint(constr) {

    removeInPlace(this.constraints, constr);
    
    visitParams(constr, true, p => removeFromSetInMap(this.paramToConstraintsGraph, p, constr));
    visitParams(constr, false, p => removeFromSetInMap(this.paramToConstraintsIndex, p, constr));
    
    if (constr.GENERATOR) {
      removeInPlace(this.generatorConstraints, constr);
      constr.visitGeneratedParams(p => this.generatedParams.delete(p));
    }
  }
}

export class System extends Index{
  constructor() {
    super();
    this.subSystems = [];
    this.constraintToSubSystem = new Map();
    this.paramToSubSystem = new Map();
  }
  
  _reset() {
    super._reset();
    this.subSystems = [];
    this.constraintToSubSystem.clear();
    this.paramToSubSystem.clear();
    COUNTER = 0;
  }
  
  _collectDependenciesForSubSystemFromConstraint(subSystem, constr) {
    visitParams(constr, false, p => {
      let generator = this.generatedParams.get(p);
      if (generator) {
        let generatorSS = this.constraintToSubSystem.get(generator);
        if (generatorSS) {
          if (subSystem.dependencies.indexOf(generatorSS) === -1) {
            subSystem.dependencies.push(generatorSS);
          }
        }
      }
    });
  }
  
  _rebuildDependencies() {
    this.subSystems.forEach(ss => {
      if (ss.dependencies.length !== 0) {
        ss.dependencies = [];
      }
    });
    this.subSystems.forEach(subSystem => {
      subSystem.constraints.forEach(constr => {
        this._collectDependenciesForSubSystemFromConstraint(subSystem, constr);
      });
    });
  }

  _groupBySubsystems() {

    if (this.subSystems.length !== 0) {
      this.subSystems = [];
    }
    this.constraintToSubSystem.clear();
    
    const visited = new Set();
    this.constraints.forEach(constr => {
      if (visited.has(constr)) {
        return;
      }
      const subSystem = this.createSubSystem();

      const stack = [constr];
      while (stack.length) {
        let workingConstr = stack.pop();
        if (visited.has(workingConstr)) {
          continue;
        }
        this._assignConstraint(workingConstr, subSystem);

        visited.add(workingConstr);
        visitParams(workingConstr, true, p => {
          const constrs = this.paramToConstraintsGraph.get(p);
          if (constrs) {
            constrs.forEach(constrToAdvance => {
              if (constrToAdvance !== workingConstr) {
                stack.push(constrToAdvance);
              }
            })
          }
        });
      }
    });

  }

  _rebuild() {
    this._groupBySubsystems();
    this._rebuildDependencies();
  }

  _assignConstraint(constr, subSystem) {
    subSystem.constraints.push(constr);
    this.constraintToSubSystem.set(constr, subSystem);
  }

  add(constr) {
    constr.id = "C_" + (COUNTER ++) ; //fixme
    let affectedSubsystems = new Set();
    let freeParams = [];
    
    visitParams(constr, false, p => {
      
      let subSystem = this.paramToSubSystem.get(p);

      if (subSystem) {
        affectedSubsystems.add(subSystem);
      } else {
        if (!isAuxParam(p) && !this.generatedParams.has(p)) {
          freeParams.push(p);
        }
      }
    });
    affectedSubsystems.forEach(ss => {
      ss.dependencies.forEach(d => affectedSubsystems.delete(d));    
    });

    let toMerge = Array.from(affectedSubsystems).sort((a, b) => a._internaOrder - b._internaOrder);
    let master;
    if (toMerge.length === 0 ) {
      // console.error("system has circular dependencies");
      master = this.createSubSystem();
    } else {
      [master, ...toMerge] = toMerge;
    }
    
    toMerge.forEach(s => {
      master.mergeWith(s);
      s.nativeParams.forEach(p => this.paramToSubSystem.set(p, master));
      removeInPlace(this.subSystems, s);
    });

    freeParams.forEach(p => {
      master.nativeParams.add(p);
      this.paramToSubSystem.set(p, master)
    });
    
    master.constraints.push(constr);
    this.constraintToSubSystem.set(constr, master);
    if (constr.GENERATOR) {
      let dependant = this.createSubSystem();
      dependant.dependencies.push(master);
      constr.visitGeneratedParams(p => {
        this.generatedParams.set(p, constr)
        this.paramToSubSystem.set(p, dependant);
      });
    }

    this._pushConstraint(constr);
    
  }

  remove(constr) {
    removeInPlace(this.constraints, constr);
    this.setConstraints(this.constraints);
  }

  setConstraints(constraints) {
    this._reset();
    constraints.forEach(c => this.add(c));
  }
  
  subSystemsByParam(param, callback) {
    let constraints = this.paramToConstraintsIndex.get(param);
    if (constraints) {
      constraints.forEach(c => callback(this.constraintToSubSystem.get(c)));
    }
  }
  
  traverse(callback, onCircular) {
    const visited = new Set();
    const loop = new Set();
    
    function doVisit(subSystem) {
      if (loop.has(subSystem)) {
        onCircular(subSystem);
        return;
      }
      loop.add(subSystem);
      subSystem.dependencies.forEach(dep => {
        if (!visited.has(dep)) {
          doVisit(dep);
        }
      });
      
      callback(subSystem);
      visited.add(subSystem);
      loop.delete(subSystem)
    }
    this.subSystems.forEach(doVisit);
  }
  
  createSubSystem() {
    const subSystem = new SubSystem();
    this.subSystems.push(subSystem);
    return subSystem;
  }
}

function visitParams(constraint, skipAux, callback) {
  if (skipAux) {
    let delegate = callback;
    callback = p => {
      if (!isAuxParam(p)) {
        delegate(p)
      }
    };  
  }
  
  if (constraint.visitParams) {
    constraint.visitParams(callback);
  } else {
    constraint.getSolveData(FAKE_RESOLVER).forEach(([, sParams]) => sParams.forEach(callback));
  }
}

function isAuxParam(param) {
  return ParametricManager.isAux(param.obj, GOT_NOTHING);
}

const GOT_NOTHING = {
  has: () => false 
};

const FAKE_RESOLVER = () => 0;

let COUNTER = 0;