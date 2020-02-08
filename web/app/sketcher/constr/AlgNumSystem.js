import {prepare} from "./solver";
import {eqEps} from "../../brep/geom/tolerance";
import {Polynomial, POW_1_FN} from "./polynomial";
import {compositeFn} from "gems/func";

const DEBUG = true;

export class AlgNumSubSystem {

  modifiers = [];

  allConstraints = [];

  paramToIsolation = new Map();

  eliminatedParams = new Map();

  polynomials = [];
  substitutedParams = new Map();
  substitutionOrder = [];

  polyToConstr = new Map();

  conflicting = new Set();
  redundant  = new Set();

  snapshot = new Map();

  constructor() {

    this.solveStatus = {
      error: 0,
      success: true
    }

  }

  get fullyConstrained() {
    return this.dof === 0;
  }

  validConstraints(callback) {
    this.allConstraints.forEach(c => {
      if (!this.conflicting.has(c)) {
        callback(c);
      }
    });
  }

  addConstraint(constraint, _ancestorParams) {

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
    let index = this.allConstraints.indexOf(constraint);
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
    this.polynomials = [];
    this.substitutedParams.clear();
    this.substitutionOrder = [];
    this.eliminatedParams.clear();
    this.polyToConstr.clear();
    this.paramToIsolation.clear();
  }

  evaluatePolynomials() {
    this.validConstraints(c => {
      c.collectPolynomials(this.polynomials);
      this.polynomials.forEach(p => this.polyToConstr.set(p, c))
    });
    if (DEBUG) {
      console.log('reducing system:');
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
          const monomial = polynomial.monomials[0];
          const terms = monomial.terms;
          if (terms.length === 1) {
            const term = terms[0];
            if (term.fn.degree === 1) {
              const p = term.param;
              const val = - polynomial.constant / monomial.constant;
              p.set(val);

              this.eliminatedParams.set(p, val);

              for (let polynomial of this.polynomials) {
                if (polynomial) {
                  polynomial.eliminate(p, val);
                }
              }

              requirePass = true;
            }
          }

          this.polynomials[i] = null;
        } else if (polynomial.monomials.length === 2 && polynomial.isLinear) {
          const [m1, m2] = polynomial.monomials;
          let p1 = m1.linearParam;
          let p2 = m2.linearParam;

          const constant = - m2.constant / m1.constant;
          if (eqEps(polynomial.constant, 0)) {

            for (let polynomial of this.polynomials) {
              if (polynomial) {
                polynomial.substitute(p1, p2, constant);
              }
            }
            this.substitute(p1, new Polynomial().monomial(constant).term(p2, POW_1_FN));
            this.polynomials[i] = null;

            requirePass = true;
          } else {
            const b = - polynomial.constant / m1.constant;

            let transaction = compositeFn();
            for (let polynomial of this.polynomials) {
              if (polynomial) {
                const polyTransaction = polynomial.linearSubstitution(p1, p2, constant, b);
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
            if (transaction) {
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


  prepare() {

    this.reset();

    this.evaluatePolynomials();

    this.polynomialIsolations = this.splitByIsolatedClusters(this.polynomials);
    this.polynomialIsolations.forEach(iso => {
      iso.beingSolvedParams.forEach(solverParam => this.paramToIsolation.set(solverParam.objectParam, iso))
    });

    if (DEBUG) {
      console.log('solving system:');
      this.polynomialIsolations.forEach((iso, i) => {
        console.log(i + ". ISOLATION, DOF: " + iso.dof);
        iso.polynomials.forEach(p => console.log(p.toString()));
      });

      console.log('with respect to:');
      this.substitutionOrder.forEach(x => console.log('X' + x.id + ' = ' + this.substitutedParams.get(x).toString()));
    }
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

    for (let initPl of polynomials) {
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
        for (let p of params) {
          let linkedPolynomials = graph.get(p);
          for (let linkedPolynomial of linkedPolynomials) {
            if (linkedPolynomial !== pl) {
              stack.push(linkedPolynomial);
            }
          }
        }
      }
      if (isolation.length) {
        clusters.push(new Isolation(isolation));
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

    // this.modifiers.forEach(m => m.modify());
    // this.prepare();

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

    for (let [p, val] of this.eliminatedParams) {
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

  isParamFullyConstrained(p) {
    const stack = [p];
    while (stack.length) {
      const param = stack.pop();
      if (!this.isParamShallowConstrained(param)) {
        return false;
      }

      const substitution = this.substitutedParams.get(p);
      if (substitution) {
        substitution.visitParams(p => stack.push(p));
      }
    }
    return true;
  }

}


class Isolation {

  constructor(polynomials) {
    this.polynomials = polynomials;
    this.beingSolvedParams = new Set();
    const residuals = [];

    this.polynomials.forEach(p => residuals.push(p.asResidual()));

    for (let residual of residuals) {
      residual.params.forEach(solverParam => {
        if (!this.beingSolvedParams.has(solverParam)) {
          solverParam.reset(solverParam.objectParam.get());
          this.beingSolvedParams.add(solverParam);
        }
      });
    }
    this.dof = this.beingSolvedParams.size - polynomials.length;

    let penaltyFunction = new PolynomialResidual();
    this.beingSolvedParams.forEach(sp => {
      const param = sp.objectParam;
      if (param.constraints) {
        param.constraints.forEach(pc => penaltyFunction.add(sp, pc))
      }
    });

    if (penaltyFunction.params.length) {
      // residuals.push(penaltyFunction);
    }

    this.numericalSolver = prepare(residuals);
  }

  get fullyConstrained() {
    return this.dof === 0;
  }

  solve(rough) {
    this.beingSolvedParams.forEach(solverParam => {
      solverParam.set(solverParam.objectParam.get());
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

  add(param, fn) {
    this.params.push(param);
    this.functions.push(fn);

  }

  error() {
    let err = 0;
    for (let i = 0 ; i < this.params.length; ++i) {
      err += this.functions[i].d0(this.params[i].get());
    }

    return err;
  }

  gradient(out) {
    for (let i = 0 ; i < this.params.length; ++i) {
      out[i] = this.functions[i].d1(this.params[i].get());
    }
  }

}

