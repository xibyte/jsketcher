import {Constraints} from './constraints';
import {AlgNumConstraint, ConstraintDefinitions} from "./constr/ANConstraints";
import {AlgNumSubSystem} from "./constr/AlgNumSystem";
import {state, stream} from 'lstream';
import {toast} from "react-toastify";
import {ISolveStage, SolvableObject} from "./constr/solvableObject";
import {Viewer} from "./viewer2d";

export {Constraints, ParametricManager}

class ParametricManager {

  constantTable = {};
  externalConstantResolver = null;

  $update = stream();

  inTransaction = false;

  $constraints = this.$update
    .map(() => [...this.algNumSystem.allConstraints].sort((c1, c2) => c1.id - c2.id))
    .remember([]);

  $generators = this.$update
    .map(() => [...this.stage.generators].sort((c1, c2) => c1.id - c2.id))
    .remember([]);

  $stages = state({
    list: null,
    pointer: -1
  });

  $constantDefinition = state('');

  groundStage = new SolveStage(this);
  viewer: Viewer;
  messageSink: (msg) => void;

  constructor(viewer) {
    this.viewer = viewer;

    this.$constantDefinition.attach((def) => this.rebuildConstantTable(def))

    this.reset();

    this.$stages.pipe(this.$update);
    this.$stages.attach(() => this.viewer.refresh());

    this.messageSink = msg => alert(msg);
  }

  reset() {
    this.$stages.next({
      list: [new SolveStage(this)],
      pointer: 0
    });
  }

  get stage() {
    const {list, pointer} = this.$stages.value;
    return list[pointer];
  }

  get stages() {
    return this.$stages.value.list;
  }

  get algNumSystem() {
    return this.stage.algNumSystem;
  }

  get constantDefinition() {
    return this.$constantDefinition.value;
  }

  startTransaction() {
    this.inTransaction = true;
    for (let stage of this.stages) {
      stage.algNumSystem.startTransaction();
    }
  }

  finishTransaction() {
    this.inTransaction = false;
    for (let stage of this.stages) {
      stage.algNumSystem.finishTransaction();
    }
    this.refresh();
  }

  get allConstraints() {
    return this.$constraints.value;
  }

  addAlgNum(constr) {
    this.add(constr);
  }

  constantResolver = value => {
    let _value = this.constantTable[value];
    if (_value === undefined && this.externalConstantResolver) {
      _value = this.externalConstantResolver(value);
    }
    if (_value !== undefined) {
      value = _value;
    }
    return value;
  };

  rebuildConstantTable(constantDefinition) {
    this.constantTable = {};
    if (constantDefinition == null) return;
    let lines = constantDefinition.split('\n');
    let prefix = "(function() { \n";
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let m = line.match(/^\s*([^\s]+)\s*=(.+)$/);
      if (m != null && m.length === 3) {
        let constant = m[1];
        try {
          let value = eval(prefix + "return " + m[2] + "; \n})()");
          this.constantTable[constant] = value;
          prefix += "const " + constant + " = " + value + ";\n"
        } catch(e) {
        }
      }
    }
  };

  onConstantsExternalChange(constantDefinition) {
    this.rebuildConstantTable(constantDefinition);
   // this.refresh();
  };

  defineNewConstant(name, value) {
    let constantDefinition = this.constantDefinition;
    let constantText = name + ' = ' + value;
    if (constantDefinition) {
      constantDefinition += '\n' + constantText;
    } else {
      constantDefinition = constantText;
    }
    this.$constantDefinition.next(constantDefinition);
  };

  updateConstraintConstants(constr) {
    this.viewer.parametricManager.refresh();
  };

  notify() {
    this.$update.next();
  };

  commit() {
    this.refresh();
  };

  _add(constr) {

    let highestStage = this.stages[0];

    constr.objects.forEach(obj => {
      if (obj.stage.index > highestStage.index) {
        highestStage = obj.stage;
      }
    });

    for (let obj of constr.objects) {
      if (obj.generator && obj.stage === highestStage) {
        toast("Cannot refer to a generated object from the same stage is being added to.");
        return;
      }
    }

    highestStage.addConstraint(constr);


    if (highestStage !== this.stage && !this.inTransaction) {
      toast("Constraint's been added to stage " + highestStage.index + "!")
    }
  };

  refresh() {
    if (this.inTransaction) {
      return;
    }
    this.notify();
    this.viewer.refresh();
  }

  add(constr) {
    this.viewer.historyManager.checkpoint();
    this._add(constr);
    this.refresh();
  };

  addAll(constrs) {
    this.viewer.historyManager.checkpoint();
    for (let i = 0; i < constrs.length; i++) {
      this._add(constrs[i]);
    }
    this.refresh();
  };

  remove(constr) {
    this.viewer.historyManager.checkpoint();
    constr.stage.algNumSystem.removeConstraint(constr);
    constr.annotations.forEach(ann => ann.layer.remove(ann));
    this.refresh();
  };

  _removeConstraint(constr) {
    constr.stage.algNumSystem.removeConstraint(constr);
    constr.annotations.forEach(ann => ann.layer.remove(ann));
  };

  removeGenerator(generator) {
    this.viewer.deselectAll();
    this.startTransaction();
    this._removeGenerator(generator);
    this.finishTransaction();
  }

  _removeGenerator(generator) {
    if (generator.__disposed) {
      return;
    }
    generator.__disposed = true;
    this._removeObjects(generator.generatedObjects, true);
    generator.stage.removeGenerator(generator);
  }

  removeObjects(objects) {
    this.startTransaction();
    this._removeObjects(objects);
    this.finishTransaction();
  }

  _removeObjects(objects, force = false) {
    objects.forEach(obj => {
      if (obj.isRoot) {
        this._removeObject(obj, force);
      }
    });
  };

  _removeObject = (obj, force?) => {
    if (obj.__disposed) {
      return;
    }
    obj.__disposed = true;
    if (obj.isGenerated && !force) {
      return;
    }

    obj.traverse(o => o.constraints.forEach(c => this._removeConstraint(c)));

    if (obj.layer != null) {
      obj.layer.remove(obj);
    }

    obj.traverse(co => co.generators.forEach(gen => {
      gen.removeObject(co, o => this._removeObject(o, true), () => this._removeGenerator(gen));
    }));
    obj.constraints.clear();
    obj.generators.clear();

    this.viewer.dimLayer.traverseSketchObjects(dim => {
      obj.accept(o => {
        if (dim.dependsOn && dim.dependsOn(o)) {
          this._removeObject(dim);
          return false;
        }
        return true;
      });
    });
  };

  invalidate() {
    for (let stage of this.stages) {
      stage.algNumSystem.invalidate();
    }
  }

  revalidateConstraint(constraint) {
    constraint.stage.algNumSystem.revalidateConstraint(constraint);
    this.notify();
  }

  prepare(interactiveObjects) {
    this.groundStage.prepare(interactiveObjects);
    for (let stage of this.stages) {
      stage.prepare(interactiveObjects);
    }
  }

  solve(rough) {
    this.groundStage.solve(rough);
    for (let stage of this.stages) {
      stage.solve(rough);
    }
  }

  addGenerator(generator) {

    let highestStage = this.stages[0];

    generator.sourceObjects(obj => {
      if (obj.stage.index > highestStage.index) {
        highestStage = obj.stage;
      }
    });

    this.addGeneratorToStage(generator, highestStage);

    if (highestStage !== this.stage && !this.inTransaction) {
      toast("Generator's been added to stage " + highestStage.index + "!")
    }

    this.refresh();
  }

  addGeneratorToStage(generator, stage) {

    let fail = false;
    generator.sourceObjects(obj => {
      if (obj.isGenerated && obj.stage === stage) {
        toast("Cannot refer to a generated object from the same stage is being added to.");
      }
    });

    if (fail) {
      return;
    }

    stage.addGenerator(generator);
    generator.generate(this.viewer);
  }

  coincidePoints(pt1, pt2) {
    this.add(new AlgNumConstraint(ConstraintDefinitions.PCoincident, [pt1, pt2]));
  }

  lockPoint(pt) {
    const lockConstr = new AlgNumConstraint(ConstraintDefinitions.LockPoint, [pt]);
    lockConstr.initConstants();
    this.add(lockConstr);
  }

  lockAngle(segment) {
    const constr = new AlgNumConstraint(ConstraintDefinitions.Angle, [segment]);
    constr.initConstants();
    this.add(constr);
  }

  lockLength(segment) {
    const constr = new AlgNumConstraint(ConstraintDefinitions.SegmentLength, [segment]);
    constr.initConstants();
    this.add(constr);
  }

  setConstantsFromGeometry(obj) {
    obj.visitLinked(o => {
      o.ancestry(ao => {
        ao.syncGeometry();
        ao.constraints.forEach(c => {
          c.setConstantsFromGeometry && c.setConstantsFromGeometry()
        })
      });
    });
  }

  newStage() {
    this.$stages.update(s => ({
      pointer: s.pointer + 1,
      list: [...s.list, new SolveStage(this)]
    }));
  }

  accommodateStages(uptoIndex) {
    const list = this.$stages.value.list;
    if (uptoIndex < list.length) {
      return;
    }
    let i = list.length;
    const createdStages = [];
    for (;i<=uptoIndex;i++) {
      createdStages.push(new SolveStage(this));
    }
    this.$stages.update(s => ({
      pointer: uptoIndex,
      list: [...s.list, ...createdStages]
    }));
  }

  getStage(index) {
    return this.stages[index];
  }

  getStageIndex(stage) {
    return this.stages.indexOf(stage);
  }
}

class SolveStage implements ISolveStage{

  generators = new Set();
  objects = new Set<SolvableObject>();
  private parametricManager: ParametricManager;
  private algNumSystem: AlgNumSubSystem;

  constructor(parametricManager) {
    this.parametricManager = parametricManager;
    this.algNumSystem = this.createAlgNumSystem();
  }

  get viewer() {
    return this.parametricManager.viewer;
  }

  assignObject(object) {
    object.stage = this;
    this.objects.add(object);
  }

  unassignObject(object) {
    object.stage = null;
    this.objects.delete(object);
  }

  addConstraint(constraint) {
    constraint.stage = this;
    constraint.annotations.forEach(ann => this.viewer.annotationLayer.add(ann));
    this.algNumSystem.addConstraint(constraint)
  }

  addGenerator(generator) {
    generator.stage = this;
    this.generators.add(generator);
  }

  removeGenerator(generator) {
    this.generators.delete(generator);
    generator.sourceObjects(obj => obj.generators.delete(generator))
  }

  createAlgNumSystem() {
    const pt = {x:0,y:0};
    const limit = 30; //px
    const calcVisualLimit = () => {
      //100 px limit
      this.viewer.screenToModel2(0, 0, pt);
      const x1 = pt.x;
      this.viewer.screenToModel2(limit, 0, pt);
      const x2 = pt.x;
      return Math.abs(x2 - x1);
    };

    return new AlgNumSubSystem(calcVisualLimit, this.parametricManager.constantResolver, this);
  }

  prepare(interactiveObjects) {
    this.algNumSystem.prepare(interactiveObjects);
  }

  solve(rough) {
    this.algNumSystem.solve(rough);
    this.generators.forEach(gen => {
      // @ts-ignore
      gen.regenerate(this.viewer);
    })
  }

  get index() {
    return this.viewer.parametricManager.getStageIndex(this);
  }
}