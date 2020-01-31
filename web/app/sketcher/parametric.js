import {askNumber} from '../utils/utils';
import {Constraints} from './constraints';
import {AlgNumConstraint, ConstraintDefinitions} from "./constr/ANConstraints";
import {AlgNumSubSystem} from "./constr/AlgNumSystem";
import {state, stream} from "../../../modules/lstream";

export {Constraints, ParametricManager}

class ParametricManager {

  constantTable = {};
  externalConstantResolver = null;

  solveSystems;

  $update = stream();

  $constraints = this.$update.map(layers => layers.reduce((all, layer) => {
    layer.allConstraints.forEach(c => all.push(c));
    layer.modifiers.forEach(c => all.push(c));
    return all
  }, []).sort((c1, c2) => c1.id - c2.id)).remember([]);

  constructor(viewer) {
    this.viewer = viewer;

    this.reset();

    this.viewer.params.define('constantDefinition', null);
    this.viewer.params.subscribe('constantDefinition', 'parametricManager', this.onConstantsExternalChange, this)();
    this.constantResolver = this.createConstantResolver();
    this.messageSink = msg => alert(msg);

  }

  get allConstraints() {
    return this.$constraints.value;
  }

  reset() {
    this.solveSystems = [new AlgNumSubSystem()];
  }

  addAlgNum(constr) {
    this.add(constr);
  }

  coincidePoints(pt1, pt2) {
    this.addAlgNum(new AlgNumConstraint(ConstraintDefinitions.PCoincident, [pt1, pt2]));
  }

  createConstantResolver() {
    return value => {
      var _value = this.constantTable[value];
      if (_value === undefined && this.externalConstantResolver) {
        _value = this.externalConstantResolver(value);
      }
      if (_value !== undefined) {
        value = _value;
      } else if (typeof(value) != 'number') {
        console.error("unable to resolve constant " + value);
      }
      return value;
    }
  }

  rebuildConstantTable(constantDefinition) {
    this.constantTable = {};
    if (constantDefinition == null) return;
    var lines = constantDefinition.split('\n');
    var prefix = "(function() { \n";
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = line.match(/^\s*([^\s]+)\s*=(.+)$/);
      if (m != null && m.length === 3) {
        var constant = m[1];
        try {
          var value = eval(prefix + "return " + m[2] + "; \n})()");
          this.constantTable[constant] = value;
          prefix += "const " + constant + " = " + value + ";\n"
        } catch(e) {
          console.log(e);
        }
      }
    }
  };

  onConstantsExternalChange(constantDefinition) {
    this.rebuildConstantTable(constantDefinition);
   // this.refresh();
  };

  defineNewConstant(name, value) {
    let constantDefinition = this.viewer.params.constantDefinition;
    let constantText = name + ' = ' + value;
    if (constantDefinition) {
      constantDefinition += '\n' + constantText;
    } else {
      constantDefinition = constantText;
    }
    this.rebuildConstantTable(constantDefinition);
    //disabling onConstantsExternalChange since we don't need re-solve
    this.viewer.params.set('constantDefinition', constantDefinition, 'parametricManager');
  };

  updateConstraintConstants(constr) {
    let c = constr;
    if (c.SettableFields === undefined) return;
    for (let f in c.SettableFields) {
      let value = c[f];
      let intro = c.SettableFields[f];
      value = askNumber(intro, typeof(value) === "number" ? value.toFixed(4) : value, prompt, this.constantResolver);
      if (value != null) {
        c[f] = value;
      }
    }
    this.viewer.parametricManager.refresh();
  };

  notify() {
    this.$update.next(this.solveSystems);
  };

  commit() {
    this.notify();
    this.viewer.refresh();
  };

  getPlacementLayerIndex(objects) {
    for (let i = this.solveSystems.length - 1; i >= 0; --i) {

      const system = this.solveSystems[i];

      for (let o of objects) {
        if (o.solveSystem === system) {
          return i;
        }
      }
    }

    return 0;
  }

  _add(constr) {

    if (constr.modifier) {
      throw 'use addModifier instead';
    }

    let system = this.solveSystems[this.getPlacementLayerIndex(constr.objects)];

    for (let o of constr.objects) {
      if (!o.solveSystem) {
        o.solveSystem = system;
      }
    }

    system.addConstraint(constr);
  };

  add(constr) {
    this.viewer.historyManager.checkpoint();
    this._add(constr);
    this.notify();
    this.viewer.refresh();
  };

  addAll(constrs) {
    this.viewer.historyManager.checkpoint();
    for (let i = 0; i < constrs.length; i++) {
      this._add(constrs[i]);
    }
    this.notify();
    this.viewer.refresh();
  };

  remove(constr) {
    this.viewer.historyManager.checkpoint();
    // this.algNumSystem.removeConstraint(constr);
    this.refresh();
  };

  removeObjects(objects) {
    throw 'implement me';

    let toRemove = new Set();

    objects.forEach(obj => obj.visitParams(p => {
      this.algNumSystem.allConstraints.forEach(c => {
        c.objects.forEach(o => {

        })
      });
      let constraints = this.system.paramToConstraintsIndex.get(p);
      if (constraints) {
        constraints.forEach(constr => {
          toRemove.add(constr);
        });
      }
    }));

    objects.forEach(obj => {
      if (obj.layer != null) {
        obj.layer.remove(obj);
      }
    });

    if (toRemove.size !== 0) {
      // toRemove.forEach(constr => {
      //   this.cleanUpOnRemove(constr);
      // });
      let survivedConstraints = [];
      this.system.constraints.forEach(c => {
        if (!toRemove.has(c)) {
          survivedConstraints.push(c);
        }
      });
      this.system.setConstraints(survivedConstraints);
      this.notify();
    }
    if (dependants.length > 0) {
      this.removeObjects(dependants);
    }
  };

  prepare() {
    this.solveSystems.forEach(system => system.prepare());
  }

  solve(rough) {
    this.solveSystems.forEach(system => system.solve(rough));
  }

  addModifier(modifier) {

    modifier.managedObjects.forEach(o => {
      if (o.solveSystem) {
        throw 'adding modifiers to already constrained objects isn not supported yet';
      }
    });

    this.viewer.historyManager.checkpoint();
    let index = this.getPlacementLayerIndex(modifier.referenceObjects) + 1;
    if (index === this.solveSystems.length) {
      this.solveSystems.push(new AlgNumSubSystem());
    }
    const solveSystem = this.solveSystems[index];
    solveSystem.modifiers.push(modifier);

    modifier.managedObjects.forEach(go => go.solveSystem = solveSystem);

    this.notify();
    this.viewer.refresh();
  }
}
