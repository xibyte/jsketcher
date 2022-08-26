import {prepare} from "./solver";
import {eqEps} from "geom/tolerance";
import {Polynomial, POW_1_FN} from "./polynomial";
import {compositeFn} from "gems/func";
import {AlgNumConstraint} from "./ANConstraints";
import {SolverParam} from "./solverParam";

const DEBUG = false;

export class AlgNumSubSystem {

  allConstraints = [];

  paramToIsolation = new Map();

  eliminatedParams = new Map();

  polynomials = [];
  substitutedParams = new Map();
  substitutionOrder = [];

  polyToConstr = new Map();

  conflicting = new Set();
  redundant  = new Set();

  interactiveParams = new Set();

  controlBounds = false;

  snapshot = new Map();

  inTransaction = false;

  visualLimit = 100;

  stage = null;

  dof: number = 0;

  requiresHardSolve: boolean = false;

  polynomialIsolations: Isolation[];

  calcVisualLimit: () => number;

  expressionResolver: (string) => any;

  solveStatus: SolveStatus;

  constructor(calcVisualLimit, expressionResolver, stage) {

    this.calcVisualLimit = calcVisualLimit;
    this.expressionResolver = expressionResolver;
    this.stage = stage;

    this.solveStatus = {
      error: 0,
      success: true
    }

  }

  get ownTopObjects() {
    return this.stage.objects;
  }

  get fullyConstrained() {
    return this.dof === 0;
  }

  owns(obj) {
    return this.stage === obj.stage;
  }

  validConstraints(callback) {
    this.allConstraints.forEach(c => {
      if (!this.conflicting.has(c)) {
        callback(c);
      }
    });
  }

  addConstraint(constraint) {

    if (this.inTransaction) {
      constraint.objects.forEach(o => o.constraints.add(constraint));
      this.allConstraints.push(constraint);
      return;
    }

    this.makeSnapshot();

    this.allConstraints.push(constraint);

    this.prepare();
    if (!this.isConflicting(constraint)) {
      this.solveFine();
      if (!this.solveStatus.success) {
        console.log("adding to conflicts");
        this.conflicting.add(constraint);
      }
    }

    if (this.isConflicting(constraint)) {
      this.rollback();
    // } else if (this.fullyConstrained) {
    //   this.rollback();
    //   this.conflicting.add(constraint);
    //   this.redundant.add(constraint);
    } else {
      constraint.objects.forEach(o => o.constraints.add(constraint));
      this.updateFullyConstrainedObjects();
    }
  }

  revalidateConstraint(constraint) {
    this.conflicting.delete(constraint);
    this.redundant.delete(constraint);
  }

  startTransaction() {
    this.inTransaction = true;
  }

  finishTransaction() {
    this.inTransaction = false;
    this.prepare();
    this.updateFullyConstrainedObjects();
  }


  invalidate() {
    this.prepare();
    this.solveFine();
    this.updateFullyConstrainedObjects();
  }

  removeConstraint(constraint) {
    this._removeConstraint(constraint);
    this.invalidate();
  }

  _removeConstraint(constraint) {
    const index = this.allConstraints.indexOf(constraint);
    if (index !== -1) {
      this.allConstraints.splice(index, 1);
      this.conflicting.delete(constraint);
      this.redundant.delete(constraint);
      constraint.objects.forEach(o => o.constraints.delete(constraint));
    }
  }

  isConflicting(constraint) {
    return this.conflicting.has(constraint);
  }

  makeSnapshot() {
    this.snapshot.clear();
    this.validConstraints(c => c.params.forEach(p => this.snapshot.set(p, p.get())));
  }

  rollback() {
    this.snapshot.forEach((val, param) => param.set(val));
  }

  reset() {
    this.polyToConstr.clear();
    this.interactiveParams.clear();
    this.requiresHardSolve = false;
  }

  evaluatePolynomials() {

    this.validConstraints(c => {
      let i = this.polynomials.length;
      c.collectPolynomials(this.polynomials);
      for (; i<this.polynomials.length; i++) {
        const polynomial = this.polynomials[i];
        this.polyToConstr.set(polynomial, c);

        c.objects.forEach(obj => {
          if (!this.owns(obj)) {
            obj.visitParams(p => {
              polynomial.eliminate(p, p.get());
            });
          }
        });
        polynomial.compact();
      }
    });

    if (DEBUG) {
      console.log('reducing system(of', this.polynomials.length, '):');
      this.polynomials.forEach(p => console.log(p.toString()));
    }

    let requirePass = true;

    while (requirePass) {
      requirePass = false;
      for (let i = 0; i < this.polynomials.length; ++i) {
        const polynomial = this.polynomials[i];
        if (!polynomial) {
          continue;
        }

        if (polynomial.monomials.length === 0) {
          this.conflicting.add(this.polyToConstr.get(polynomial));
          if (DEBUG) {
            console.log("CONFLICT: " + polynomial.toString());
          }
          if (eqEps(polynomial.constant, 0)) {
            this.redundant.add(this.polyToConstr.get(polynomial));
            // console.log("REDUNDANT");
          }
          this.polynomials[i] = null;
        } else if (polynomial.isLinear && polynomial.monomials.length === 1) {
          this.polynomials[i] = null;
          const monomial = polynomial.monomials[0];
          const terms = monomial.terms;
          if (terms.length === 1) {
            const term = terms[0];
            if (term.fn.degree === 1) {
              const p = term.param;
              const val = - polynomial.constant / monomial.constant;
              p.set(val);

              this.eliminatedParams.set(p, val);

              for (const otherPolynomial of this.polynomials) {
                if (otherPolynomial) {
                  otherPolynomial.eliminate(p, val);
                }
              }

              requirePass = true;
            }
          }

        } else if (polynomial.monomials.length === 2 && polynomial.isLinear) {
          let [m1, m2] = polynomial.monomials;

          if (this.interactiveParams.has(m1.linearParam)) {
            const t = m1;
            m1 = m2;
            m2 = t;
          }

          const p1 = m1.linearParam;
          const p2 = m2.linearParam;

          const constant = - m2.constant / m1.constant;
          if (eqEps(polynomial.constant, 0)) {

            this.polynomials[i] = null;
            this.substitute(p1, new Polynomial().monomial(constant).term(p2, POW_1_FN));
            for (const otherPolynomial of this.polynomials) {
              if (otherPolynomial) {
                otherPolynomial.substitute(p1, p2, constant);
              }
            }
            requirePass = true;
          } else {
            const b = - polynomial.constant / m1.constant;

            let transaction = compositeFn();
            for (const otherPolynomial of this.polynomials) {
              if (otherPolynomial && otherPolynomial !== polynomial) {
                const polyTransaction = otherPolynomial.linearSubstitution(p1, p2, constant, b);
                if (!polyTransaction) {
                  transaction = null;
                  break;
                }
                transaction.push(polyTransaction);
                transaction.push(() => {
                  this.substitute(p1, new Polynomial(b).monomial(constant).term(p2, POW_1_FN));
                  this.polynomials[i] = null;
                });
              }
            }
            if (transaction && transaction.functionList.length !== 0) {
              transaction();
              requirePass = true;
            }
          }
        }
      }

      if (requirePass) {
        this.polynomials.forEach(polynomial => polynomial && polynomial.compact());
      }
    }


    this.polynomials = this.polynomials.filter(p => p);

  }

  substitute(param, overPolynomial) {
    this.substitutionOrder.push(param);
    this.substitutedParams.set(param, overPolynomial);
  }


  prepare(interactiveObjects = []) {

    this.reset();
    interactiveObjects.forEach(obj => obj.visitParams(p => this.interactiveParams.add(p)));

    this.validConstraints(c => c.objects.forEach(obj => {
      if (!this.owns(obj)) {
        this.requiresHardSolve = true;
      }
    }));

    this.validConstraints(c => c.resolveConstants(this.expressionResolver));

    this.evaluateAndBuildSolver();

    this.visualLimit = this.calcVisualLimit();

    if (DEBUG) {
      console.log('solving system:');
      this.polynomialIsolations.forEach((iso, i) => {
        console.log(i + ". ISOLATION, DOF: " + iso.dof);
        iso.polynomials.forEach(p => console.log(p.toString()));
      });

      console.log('with respect to:');
      this.substitutionOrder.forEach(x => console.log(x.toString() + ' = ' + this.substitutedParams.get(x).toString()));
    }
  }

  evaluateAndBuildSolver() {
    this.polynomials = [];
    this.substitutedParams.clear();
    this.substitutionOrder = [];
    this.eliminatedParams.clear();
    this.paramToIsolation.clear();

    this.validConstraints(c => c.params.forEach(p => p.normalizer && p.set(p.normalizer(p.get()))));

    this.evaluatePolynomials();

    this.polynomialIsolations = this.splitByIsolatedClusters(this.polynomials);
    this.polynomialIsolations.forEach(iso => {
      iso.beingSolvedParams.forEach(solverParam => this.paramToIsolation.set(solverParam.objectParam, iso))
    });
  }

  splitByIsolatedClusters(polynomials) {


    const graph = new Map();

    function link(a, b) {
      let list = graph.get(a);
      if (!list) {
        list = [];
        graph.set(a, list);
      }
      list.push(b);
    }

    const visited = new Set();

    polynomials.forEach(pl => {
      visited.clear();
      pl.visitParams(p => {
        if (visited.has(p)) {
          return;
        }
        visited.add(p);
        link(p, pl);
        link(pl, p);
      })
    });

    visited.clear();

    const clusters = [];

    for (const initPl of polynomials) {
      if (visited.has(initPl)) {
        continue
      }
      const stack = [initPl];
      const isolation = [];
      while (stack.length) {
        const pl = stack.pop();
        if (visited.has(pl)) {
          continue;
        }
        isolation.push(pl);
        visited.add(pl);
        const params = graph.get(pl);
        for (const p of params) {
          const linkedPolynomials = graph.get(p);
          for (const linkedPolynomial of linkedPolynomials) {
            if (linkedPolynomial !== pl) {
              stack.push(linkedPolynomial);
            }
          }
        }
      }
      if (isolation.length) {
        clusters.push(new Isolation(isolation, this));
      }
    }

    return clusters;
  }

  solveRough() {
    this.solve(true);
  }

  solveFine() {
    this.solve(false);
  }


  solve(rough) {

    if (this.requiresHardSolve) {
      this.evaluateAndBuildSolver();
    }

    this.polynomialIsolations.forEach(iso => {
      iso.solve(rough);
    });

    if (!rough) {

      this.solveStatus.error = 0;
      this.solveStatus.success = true;

      this.polynomialIsolations.forEach(iso => {
        this.solveStatus.error = Math.max(this.solveStatus.error, iso.solveStatus.error);
        this.solveStatus.success = this.solveStatus.success && iso.solveStatus.success;
      });

      if (DEBUG) {
        console.log('numerical result: ' + this.solveStatus.success);
      }
    }

    for (const [p, val] of this.eliminatedParams) {
      p.set(val);
    }

    for (let i = this.substitutionOrder.length - 1; i >= 0; i--) {
      const param = this.substitutionOrder[i];
      const expression = this.substitutedParams.get(param);
      param.set(expression.value());
    }
  }

  updateFullyConstrainedObjects() {

    this.validConstraints(c => {

      c.objects.forEach(obj => {

        let allLocked = true;

        obj.visitParams(p => {
          if (!this.isParamFullyConstrained(p)) {
            allLocked = false;
          }
        });

        obj.fullyConstrained = allLocked;
      });
    });
  }

  isParamShallowConstrained(p) {
    const iso = this.paramToIsolation.get(p);
    return this.eliminatedParams.has(p) || (iso && iso.fullyConstrained);
  }

  isParamFullyConstrained(sourceParam) {

    const visited = new Set();

    const dfs = param => {
      if (visited.has(param)) {
        return;
      }
      visited.add(param);
      if (this.isParamShallowConstrained(param)) {
        return true;
      }
      const substitution = this.substitutedParams.get(param);
      let res = false;
      if (substitution) {
        substitution.visitParams(p => {
          if (dfs(p)) {
            res = true;
          }
        });
      }
      return res;
    };
    return dfs(sourceParam);
  }

}


class Isolation {
  polynomials: Polynomial[];
  system: AlgNumSubSystem;
  beingSolvedParams: Set<SolverParam>;
  beingSolvedConstraints: Set<AlgNumConstraint>;
  dof: number;
  solveStatus: SolveStatus;
  numericalSolver: { system; diagnose; solveSystem; error; updateLock };

  constructor(polynomials, system) {
    this.system = system;
    this.polynomials = polynomials;
    this.beingSolvedParams = new Set();
    this.beingSolvedConstraints = new Set();
    const residuals = [];

    this.polynomials.forEach(p => {
      residuals.push(p.asResidual());
      this.beingSolvedConstraints.add(system.polyToConstr.get(p));
    });

    for (const residual of residuals) {
      residual.params.forEach(solverParam => {
        if (!this.beingSolvedParams.has(solverParam)) {
          solverParam.reset(solverParam.objectParam.get());
          this.beingSolvedParams.add(solverParam);
        }
      });
    }
    this.dof = this.beingSolvedParams.size - polynomials.length;
    const penaltyFunction = new PolynomialResidual();
    this.beingSolvedParams.forEach(sp => {
      const param = sp.objectParam;
      if (param.constraints) {
        penaltyFunction.add(sp, param.constraints);
      }
    });

    if (penaltyFunction.params.length) {
      residuals.push(penaltyFunction);
    }

    this.numericalSolver = prepare(residuals);
  }

  get fullyConstrained() {
    return this.dof === 0;
  }

  solve(rough) {

    this.beingSolvedConstraints.forEach(c => c.initialGuess());

    this.beingSolvedParams.forEach(solverParam => {
      let val = solverParam.objectParam.get();

      if (this.system.controlBounds) {
        if (solverParam.objectParam.enforceVisualLimit && val < this.system.visualLimit) {
          val = this.system.visualLimit;
        }
      }
      solverParam.set(val);
    });

    this.solveStatus = this.numericalSolver.solveSystem(rough);

    this.beingSolvedParams.forEach(solverParam => {
      solverParam.objectParam.set(solverParam.get());
    });
  }

}

class PolynomialResidual {

  params = [];
  functions = [];

  add(param, fns) {
    this.params.push(param);
    this.functions.push(fns);
  }

  error() {
    let err = 0;
    for (let i = 0 ; i < this.params.length; ++i) {
      const val = this.params[i].get();
      const paramFunctions = this.functions[i];
      for (const fn of paramFunctions) {
        const d0 = fn.d0(val);
        err += d0;// * d0;
      }
    }

    return err;//0.5 * err;
  }

  gradient(out) {
    for (let i = 0 ; i < this.params.length; ++i) {
      const val = this.params[i].get();
      const paramFunctions = this.functions[i];
      for (const fn of paramFunctions) {
        // const d0 = fn.d0(val);
        const d1 = fn.d1(val);
        out[i] += d1; //d0 * d1; //degenerated chain rule
      }
    }
  }

}

export interface SolveStatus {
  success: boolean;
  error: number;
}