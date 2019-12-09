import {createByConstraintName} from "./solverConstraints";
import {Param, prepare} from "./solver";
import {findConstructionCluster} from "./constructions";
import {GCCircle, GCPoint} from "./constractibles";


const ConstraintDegree = {
  PARTIALLY_SOLVABLE: 1,
  NOT_SOLVABLE: 2,
  SOLVABLE: 3
};


export class SEACSystem {
  constraints = [];
  locked = new Set();
  systemTransaction = new SystemTransaction(this);

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  startTransaction(interactiveLock = []) {
    this.systemTransaction.prepare(interactiveLock);
    return this.systemTransaction;
  }
}

export class SystemTransaction {

  locked = new Set();
  scheduled = new Map();
  internalObjects = new Set();
  decayedObjects = new Set();
  clusters = [];

  constructor(system) {
    this.system = system;
  }

  constraintDegree(constraint) {

    let hasNonFreeAgents = false;
    let hasFreeAgents = false;

    for (let obj of constraint.objects) {

      if (this.isLocked(obj) || this.decayedObjects.has(obj)) {
        hasNonFreeAgents = true;
      } else {
        hasFreeAgents = true;
      }
    }

    if (hasNonFreeAgents && hasFreeAgents) {
      return ConstraintDegree.PARTIALLY_SOLVABLE;
    } else if (hasNonFreeAgents) {
      return ConstraintDegree.NOT_SOLVABLE;
    } else {
      return ConstraintDegree.SOLVABLE;
    }
  }

  findClusterForIsolated(constraint) {
    for (let i = this.clusters.length - 1; i >= 0; i--) {
      const cluster = this.clusters[i];
      if (constraint.objects.find(o => cluster.ownObjects.has(o))) {
        return cluster;
      }
    }
    console.log(`constraint ${constraint.id} can't be solved and will be skipped, most likely it's attached to read only geometry only`);
    return null;
  }

  createCluster(constraints = []) {
    const cluster = new Cluster(this, constraints);
    this.clusters.push(cluster);
    return cluster;
  }

  lock(object) {
    this.locked.add(object);
  }

  isLocked = object => {
    return this.locked.has(object);
  };

  schedule(constr, cluster) {
    this.scheduled.set(constr, cluster);
  }

  isScheduled = constr => {
    return this.scheduled.has(constr);
  };

  prepare(interactiveLock) {
    const schedule = queue => {

      for (let constr of queue) {

        if (this.isScheduled(constr)) {
          continue; // we're cool - solved as a part of construction cluster
        }

        let clusterConstraints = findConstructionCluster(constr, this.isScheduled);
        clusterConstraints.forEach((c, i) => {
          if (this.constraintDegree(c) === ConstraintDegree.NOT_SOLVABLE) {
            console.log('isolation detected for constraint ' + constr.id);
            const neighbour = this.findClusterForIsolated(c);
            if (!neighbour) {
              console.warn('unable to resolve isolation for constraint ' + constr.id);
              return;
            }
            neighbour.add(c);
            clusterConstraints[i] = null;
          }
        });
        clusterConstraints = clusterConstraints.filter(c => c !== null);
        if (clusterConstraints.length) {
          this.createCluster(clusterConstraints);
        }
      }

    };

    this.cleanup();

    interactiveLock.forEach(l => this.locked.add(l));
    this.system.locked.forEach(l => this.locked.add(l));

    this.system.constraints.forEach(c => c.objects.forEach(o => o.visitChildren( c => {
      this.internalObjects.add(c);
      if (this.isLocked(c)) {
        this.decayedObjects.add(o);
      }
    } )) );

    const queue = [...this.system.constraints];
    const constraintRank = constr => {
      const pureSEAC = !constr.objects.find(o => o instanceof GCPoint);
      const hasLocks = !!constr.objects.find(o => this.locked.has(o) || this.decayedObjects.has(o));
      const referToInternals = !!constr.objects.find(o => this.internalObjects.has(o));
      let rank = 0;
      if (referToInternals) {
        rank += 1000;
      }
      if (!pureSEAC) {
        rank += 100
      }
      if (!hasLocks) {
        rank += 10;
      }
      return rank;
    };
    queue.sort((a,b) => constraintRank(a) - constraintRank(b));

    schedule(queue);

    console.log("SOLVER SCHEDULING RESULTS:");
    console.dir(this.clusters);

    this.clusterTransactions = this.clusters.map(cluster => cluster.startTransaction());

  }

  cleanup() {
    this.locked.clear();
    this.scheduled.clear();
    this.internalObjects.clear();
    this.decayedObjects.clear();
    this.clusters = [];
    this.clusterTransactions = undefined;
  }

  relaxObjects() {
    this.clusterTransactions.forEach(ct => {
      ct.cluster.ownObjects.forEach(o => {
        if (o instanceof GCCircle) {
          if (o.r.get() <= 5) {
            o.r.set(20);
          }
        }
      });
    });
  }

  solve = rough => {
    this.relaxObjects();
    this.clusterTransactions.forEach(t => t.solve(rough));
  }
}


class Cluster {

  constructor(systemTransaction, constraints) {
    this.systemTransaction = systemTransaction;
    this.constraints = [];
    this.ownObjects = new Set();
    constraints.forEach(c => this.add(c));
  }

  consumeObject(o) {
    this.systemTransaction.lock(o);
    this.ownObjects.add(o);
  }

  add(constraint) {
    this.systemTransaction.schedule(constraint, this);
    constraint.objects.forEach(o => {
      if (!this.systemTransaction.isLocked(o)) {
        this.consumeObject(o);
        o.visitChildren(c => {
          if (!this.systemTransaction.isLocked(c)) {
            this.consumeObject(c);
          }
        });
      }
    });
    this.constraints.push(constraint);
  }

  get capacity() {
    return this.constraints.length;
  }

  startTransaction() {

    const residuals = [];
    const solverConstrs = [];
    const transState = new TransactionState();

    this.constraints.forEach(c => c.collectResiduals(residuals));

    for (let i = 0; i < residuals.length; ++i) {

      const [fn, gcParams, constants] = residuals[i];

      const solverParams = gcParams.map(gcParam => {
        const solverParam = transState.createSolverParam(gcParam);

        solverParam.constant = !this.ownObjects.has(gcParam.object);
        return solverParam;
      });

      const constr = fn(solverParams, constants);
      solverConstrs.push(constr);
    }
    const solver = prepare(solverConstrs);
    return new ClusterTransaction(solver, transState, this);
  }
}

class TransactionState {

  paramMap = new Map();

  createSolverParam(gcParam) {
    let solverParam = this.paramMap.get(gcParam);
    if (!solverParam) {
      solverParam = new Param(gcParam.get());
      this.paramMap.set(gcParam, solverParam);
    }
    return solverParam;
  }
}

class ClusterTransaction {

  constructor(solver, state, cluster) {
    this.solver = solver;
    this.state = state;
    this.cluster = cluster;
  }

  solve(rough) {
    this.state.paramMap.forEach((solverParam, gcParam) => {
      solverParam.reset(gcParam.get());
    });

    this.solver.solveSystem(rough);

    this.state.paramMap.forEach((solverParam, gcParam) => {
      if (!solverParam.constant) {
        gcParam.set(solverParam.get());
      }
    });
  }

}
