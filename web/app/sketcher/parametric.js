import {askNumber} from '../utils/utils';
import {Constraints} from './constraints';
import {AlgNumConstraint, ConstraintDefinitions} from "./constr/ANConstraints";
import {AlgNumSubSystem} from "./constr/AlgNumSystem";
import {stream} from "../../../modules/lstream";

export {Constraints, ParametricManager}

class ParametricManager {

  algnNumSystem;
  constantTable = {};
  externalConstantResolver = null;

  $constraints = stream().remember([]);

  constructor(viewer) {
    this.viewer = viewer;

    this.reset();


    this.viewer.params.define('constantDefinition', null);
    this.viewer.params.subscribe('constantDefinition', 'parametricManager', this.onConstantsExternalChange, this)();
    this.constantResolver = this.createConstantResolver();
    this.messageSink = msg => alert(msg);

  }

  reset() {
    this.algnNumSystem = new AlgNumSubSystem();
  }

  get subSystems() {
    return this.system.subSystems;
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
    this.refresh();
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

  notify(event) {
    this.$constraints.next(this.algnNumSystem.allConstraints);
  };

  refresh() {
    console.log("calling non existent method");
  };

  _add(constr) {
    this.viewer.historyManager.checkpoint();
    this.algnNumSystem.addConstraint(constr);
    this.notify();
    this.viewer.refresh();
  };

  add(constr) {
    this.viewer.historyManager.checkpoint();
    this.algnNumSystem.addConstraint(constr);
    this.notify();
    this.viewer.refresh();
  };

  addAll(constrs) {
    this.viewer.historyManager.checkpoint();
    for (let i = 0; i < constrs.length; i++) {
      this.algnNumSystem.addConstraint(constrs[i]);
    }
    this.notify();
    this.viewer.refresh();
  };

  remove(constr) {
    this.viewer.historyManager.checkpoint();
    this.algnNumSystem.removeConstraint(constr);
    this.refresh();
  };

  removeObjects(objects) {
    throw 'implement me';

    let toRemove = new Set();

    objects.forEach(obj => obj.visitParams(p => {
      this.algnNumSystem.allConstraints.forEach(c => {
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
}


