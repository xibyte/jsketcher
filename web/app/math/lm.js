/**
 * This class solves a least-squares problem using the Levenberg-Marquardt algorithm.
 *
 * <p>This implementation <em>should</em> work even for over-determined systems
 * (i.e. systems having more point than equations). Over-determined systems
 * are solved by ignoring the point which have the smallest impact according
 * to their jacobian column norm. Only the rank of the matrix and some loop bounds
 * are changed to implement this.</p>
 *
 * <p>The resolution engine is a simple translation of the MINPACK <a
 * href="http://www.netlib.org/minpack/lmder.f">lmder</a> routine with minor
 * changes. The changes include the over-determined resolution, the use of
 * inherited convergence checker and the Q.R. decomposition which has been
 * rewritten following the algorithm described in the
 * P. Lascaux and R. Theodor book <i>Analyse num&eacute;rique matricielle
 * appliqu&eacute;e &agrave; l'art de l'ing&eacute;nieur</i>, Masson 1986.</p>
 * <p>The authors of the original fortran version are:
 * <ul>
 * <li>Argonne National Laboratory. MINPACK project. March 1980</li>
 * <li>Burton S. Garbow</li>
 * <li>Kenneth E. Hillstrom</li>
 * <li>Jorge J. More</li>
 * </ul>
 * The redistribution policy for MINPACK is available <a
 * href="http://www.netlib.org/minpack/disclaimer">here</a>, for convenience, it
 * is reproduced below.</p>
 *
 * <table border="0" width="80%" cellpadding="10" align="center" bgcolor="#E0E0E0">
 * <tr><td>
 *    Minpack Copyright Notice (1999) University of Chicago.
 *    All rights reserved
 * </td></tr>
 * <tr><td>
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * <ol>
 *  <li>Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.</li>
 * <li>Redistributions in binary form must reproduce the above
 *     copyright notice, this list of conditions and the following
 *     disclaimer in the documentation and/or other materials provided
 *     with the distribution.</li>
 * <li>The end-user documentation included with the redistribution, if any,
 *     must include the following acknowledgment:
 *     <code>This product includes software developed by the University of
 *           Chicago, as Operator of Argonne National Laboratory.</code>
 *     Alternately, this acknowledgment may appear in the software itself,
 *     if and wherever such third-party acknowledgments normally appear.</li>
 * <li><strong>WARRANTY DISCLAIMER. THE SOFTWARE IS SUPPLIED "AS IS"
 *     WITHOUT WARRANTY OF ANY KIND. THE COPYRIGHT HOLDER, THE
 *     UNITED STATES, THE UNITED STATES DEPARTMENT OF ENERGY, AND
 *     THEIR EMPLOYEES: (1) DISCLAIM ANY WARRANTIES, EXPRESS OR
 *     IMPLIED, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES
 *     OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE
 *     OR NON-INFRINGEMENT, (2) DO NOT ASSUME ANY LEGAL LIABILITY
 *     OR RESPONSIBILITY FOR THE ACCURACY, COMPLETENESS, OR
 *     USEFULNESS OF THE SOFTWARE, (3) DO NOT REPRESENT THAT USE OF
 *     THE SOFTWARE WOULD NOT INFRINGE PRIVATELY OWNED RIGHTS, (4)
 *     DO NOT WARRANT THAT THE SOFTWARE WILL FUNCTION
 *     UNINTERRUPTED, THAT IT IS ERROR-FREE OR THAT ANY ERRORS WILL
 *     BE CORRECTED.</strong></li>
 * <li><strong>LIMITATION OF LIABILITY. IN NO EVENT WILL THE COPYRIGHT
 *     HOLDER, THE UNITED STATES, THE UNITED STATES DEPARTMENT OF
 *     ENERGY, OR THEIR EMPLOYEES: BE LIABLE FOR ANY INDIRECT,
 *     INCIDENTAL, CONSEQUENTIAL, SPECIAL OR PUNITIVE DAMAGES OF
 *     ANY KIND OR NATURE, INCLUDING BUT NOT LIMITED TO LOSS OF
 *     PROFITS OR LOSS OF DATA, FOR ANY REASON WHATSOEVER, WHETHER
 *     SUCH LIABILITY IS ASSERTED ON THE BASIS OF CONTRACT, TORT
 *     (INCLUDING NEGLIGENCE OR STRICT LIABILITY), OR OTHERWISE,
 *     EVEN IF ANY OF SAID PARTIES HAS BEEN WARNED OF THE
 *     POSSIBILITY OF SUCH LOSS OR DAMAGES.</strong></li>
 * <ol></td></tr>
 * </table>
 *
 * @version $Id: LevenbergMarquardtOptimizer.java 1416643 2012-12-03 19:37:14Z tn $
 * @constructor
 */
export default function LMOptimizer(startPoint, target, model, jacobian) {


    this.startPoint = startPoint;
    this.target = target;
    this.evalCount = 0;
    this.evalMaximalCount = 100000;
    this.model = model;
    this.jacobian = jacobian;

    this.identity = function(size) {
      var out = [];
      for (var row = 0; row < size; ++row) {
          out.push([]);
          for (var col = 0; col < size; ++col) {
              out[row].push( row === col ? 1 : 0);
          }
      }
      return out;
    }



    /** Square-root of the weight matrix. */
    this.weightMatrixSqrt = this.identity(target.length);//TMath.identity(new TMath.Matrix(target.length, target.length)); //TODO:
    this.weightMatrix = this.identity(target.length);
    /** Cost value (square root of the sum of the residuals). */
    this.cost = null;
    /** Number of solved point. */
    this.solvedCols = null;
    /** Diagonal elements of the R matrix in the Q.R. decomposition. */
    this.diagR = null;
    /** Norms of the columns of the jacobian matrix. */
    this.jacNorm = null;
    /** Coefficients of the Householder transforms vectors. */
    this.beta = null;
    /** Columns permutation array. */
    this.permutation = null;
    /** Rank of the jacobian matrix. */
    this.rank = null;
    /** Levenberg-Marquardt parameter. */
    this.lmPar = null;
    /** Parameters evolution direction associated with lmPar. */
    this.lmDir = null;
    /** Positive input variable used in determining the initial step bound. */
    this.initialStepBoundFactor = null;
    /** Desired relative error in the sum of squares. */
    this.costRelativeTolerance = null;
    /**  Desired relative error in the approximate solution parameters. */
    this.parRelativeTolerance = null;
    /** Desired max cosine on the orthogonality between the function vector
     * and the columns of the jacobian. */
    this.orthoTolerance = null;
    /** Threshold for QR ranking. */
    this.qrRankingThreshold = null;
    /** Weighted residuals. */
    this.weightedResidual = null;
    /** Weighted Jacobian. */
    this.weightedJacobian = null;

    this.checker = null;


    function arr(size) {
      var out = [];
      out.length = size;
      for (var i = 0; i < size; ++i) {
          out[i] = 0;
      }
      return out;
    }

    function Arrays_fill(a, fromIndex, toIndex,val) {
      for (var i = fromIndex; i < toIndex; i++)
        a[i] = val;
    }

//    var SAFE_MIN = Number.MIN_VALUE; //FIXME!!!!
    var SAFE_MIN = 1e-30; //FIXME!!!!

    /**
     * Build an optimizer for least squares problems with default values
     * for all the tuning parameters (see the {@link
     * #LevenbergMarquardtOptimizer(double,double,double,double,double)
     * other contructor}.
     * The default values for the algorithm settings are:
     * <ul>
     *  <li>Initial step bound factor: 100</li>
     *  <li>Cost relative tolerance: 1e-10</li>
     *  <li>Parameters relative tolerance: 1e-10</li>
     *  <li>Orthogonality tolerance: 1e-10</li>
     *  <li>QR ranking threshold: {@link Precision#SAFE_MIN}</li>
     * </ul>
     */
    this.init = function() {
        this.init1(100, 1e-10, 1e-10, 1e-10, SAFE_MIN);
    }



    /**
     * Build an optimizer for least squares problems with default values
     * for some of the tuning parameters (see the {@link
     * #LevenbergMarquardtOptimizer(double,double,double,double,double)
     * other contructor}.
     * The default values for the algorithm settings are:
     * <ul>
     *  <li>Initial step bound factor}: 100</li>
     *  <li>QR ranking threshold}: {@link Precision#SAFE_MIN}</li>
     * </ul>
     *
     * @param costRelativeTolerance Desired relative error in the sum of
     * squares.
     * @param parRelativeTolerance Desired relative error in the approximate
     * solution parameters.
     * @param orthoTolerance Desired max cosine on the orthogonality between
     * the function vector and the columns of the Jacobian.
     */
    this.init0 = function(costRelativeTolerance,
                          parRelativeTolerance,
                          orthoTolerance) {
        this.init1(100, costRelativeTolerance, parRelativeTolerance, orthoTolerance,
             SAFE_MIN);
    }

    /**
     * The arguments control the behaviour of the default convergence checking
     * procedure.
     * Additional criteria can defined through the setting of a {@link
     * ConvergenceChecker}.
     *
     * @param initialStepBoundFactor Positive input variable used in
     * determining the initial step bound. This bound is set to the
     * product of initialStepBoundFactor and the euclidean norm of
     * {@code diag * x} if non-zero, or else to {@code initialStepBoundFactor}
     * itself. In most cases factor should lie in the interval
     * {@code (0.1, 100.0)}. {@code 100} is a generally recommended value.
     * @param costRelativeTolerance Desired relative error in the sum of
     * squares.
     * @param parRelativeTolerance Desired relative error in the approximate
     * solution parameters.
     * @param orthoTolerance Desired max cosine on the orthogonality between
     * the function vector and the columns of the Jacobian.
     * @param threshold Desired threshold for QR ranking. If the squared norm
     * of a column vector is smaller or equal to this threshold during QR
     * decomposition, it is considered to be a zero vector and hence the rank
     * of the matrix is reduced.
     */
    this.init1 = function(initialStepBoundFactor,
                          costRelativeTolerance,
                          parRelativeTolerance,
                          orthoTolerance,
                          threshold) {
        this.initialStepBoundFactor = initialStepBoundFactor;
        this.costRelativeTolerance = costRelativeTolerance;
        this.parRelativeTolerance = parRelativeTolerance;
        this.orthoTolerance = orthoTolerance;
        this.qrRankingThreshold = threshold;
    }

    /** {@inheritDoc} */

    this.doOptimize = function() {
        var nR = this.target.length; // Number of observed data.
        var currentPoint = this.startPoint;
        var nC = currentPoint.length; // Number of parameters.

        // arrays shared with the other private methods
        this.solvedCols  = Math.min(nR, nC);
        this.diagR       = arr(nC);
        this.jacNorm     = arr(nC);
        this.beta        = arr(nC);
        this.permutation = arr(nC);
        this.lmDir       = arr(nC);

        // local point
        var   delta   = 0;
        var   xNorm   = 0;
        var diag    = arr(nC);
        var oldX    = arr(nC);
        var oldRes  = arr(nR);
        var oldObj  = arr(nR);
        var qtf     = arr(nR);
        var work1   = arr(nC);
        var work2   = arr(nC);
        var work3   = arr(nC);

        var weightMatrixSqrt = this.getWeightSquareRoot();

        // Evaluate the function at the starting point and calculate its norm.
        var currentObjective = this.computeObjectiveValue(currentPoint);
        var currentResiduals = this.computeResiduals(currentObjective);
        var current = [currentPoint, currentObjective];
        var currentCost = this.computeCost(currentResiduals);

        // Outer loop.
        this.lmPar = 0;
        var firstIteration = true;
        var iter = 0;

        while (true) {
            ++iter;
            var previous = current;

            // QR decomposition of the jacobian matrix
            this.qrDecomposition(this.computeWeightedJacobian(currentPoint));

            this.weightedResidual = this.operate(weightMatrixSqrt, currentResiduals);
            for (var i = 0; i < nR; i++) {
                qtf[i] = this.weightedResidual[i];
            }

            // compute Qt.res
            this.qTy(qtf);

            // now we don't need Q anymore,
            // so let jacobian contain the R matrix with its diagonal elements
            for (var k = 0; k < this.solvedCols; ++k) {
                var pk = this.permutation[k];
                this.weightedJacobian[k][pk] = this.diagR[pk];
            }

            if (firstIteration) {
                // scale the point according to the norms of the columns
                // of the initial jacobian
                xNorm = 0;
                for (var k = 0; k < nC; ++k) {
                    var dk = this.jacNorm[k];
                    if (dk == 0) {
                        dk = 1.0;
                    }
                    var xk = dk * currentPoint[k];
                    xNorm  += xk * xk;
                    diag[k] = dk;
                }
                xNorm = Math.sqrt(xNorm);

                // initialize the step bound delta
                delta = (xNorm == 0) ? this.initialStepBoundFactor : (this.initialStepBoundFactor * xNorm);
            }

            // check orthogonality between function vector and jacobian columns
            var maxCosine = 0;
            if (currentCost != 0) {
                for (var j = 0; j < this.solvedCols; ++j) {
                    var    pj = this.permutation[j];
                    var s  = this.jacNorm[pj];
                    if (s != 0) {
                        var sum = 0;
                        for (var i = 0; i <= j; ++i) {
                            sum += this.weightedJacobian[i][pj] * qtf[i];
                        }
                        maxCosine = Math.max(maxCosine, Math.abs(sum) / (s * currentCost));
                    }
                }
            }
            if (maxCosine <= this.orthoTolerance) {
                // Convergence has been reached.
                this.setCost(currentCost);
                return current;
            }

            // rescale if necessary
            for (var j = 0; j < nC; ++j) {
                diag[j] = Math.max(diag[j], this.jacNorm[j]);
            }

            // Inner loop.
            for (var ratio = 0; ratio < 1.0e-4;) {

                // save the state
                for (var j = 0; j < this.solvedCols; ++j) {
                    var pj = this.permutation[j];
                    oldX[pj] = currentPoint[pj];
                }
                var previousCost = currentCost;
                var tmpVec = this.weightedResidual;
                this.weightedResidual = oldRes;
                oldRes    = tmpVec;
                tmpVec    = currentObjective;
                currentObjective = oldObj;
                oldObj    = tmpVec;

                // determine the Levenberg-Marquardt parameter
                this.determineLMParameter(qtf, delta, diag, work1, work2, work3);

                // compute the new point and the norm of the evolution direction
                var lmNorm = 0;
                for (var j = 0; j < this.solvedCols; ++j) {
                    var pj = this.permutation[j];
                    this.lmDir[pj] = -this.lmDir[pj];
                    currentPoint[pj] = oldX[pj] + this.lmDir[pj];
                    var s = diag[pj] * this.lmDir[pj];
                    lmNorm  += s * s;
                }
                lmNorm = Math.sqrt(lmNorm);
                // on the first iteration, adjust the initial step bound.
                if (firstIteration) {
                    delta = Math.min(delta, lmNorm);
                }

                // Evaluate the function at x + p and calculate its norm.
                currentObjective = this.computeObjectiveValue(currentPoint);
                currentResiduals = this.computeResiduals(currentObjective);
                current = [currentPoint, currentObjective];
                currentCost = this.computeCost(currentResiduals);

                // compute the scaled actual reduction
                var actRed = -1.0;
                if (0.1 * currentCost < previousCost) {
                    var r = currentCost / previousCost;
                    actRed = 1.0 - r * r;
                }

                // compute the scaled predicted reduction
                // and the scaled directional derivative
                for (var j = 0; j < this.solvedCols; ++j) {
                    var pj = this.permutation[j];
                    var dirJ = this.lmDir[pj];
                    work1[j] = 0;
                    for (var i = 0; i <= j; ++i) {
                        work1[i] += this.weightedJacobian[i][pj] * dirJ;
                    }
                }
                var coeff1 = 0;
                for (var j = 0; j < this.solvedCols; ++j) {
                    coeff1 += work1[j] * work1[j];
                }
                var pc2 = previousCost * previousCost;
                coeff1 = coeff1 / pc2;
                var coeff2 = this.lmPar * lmNorm * lmNorm / pc2;
                var preRed = coeff1 + 2 * coeff2;
                var dirDer = -(coeff1 + coeff2);

                // ratio of the actual to the predicted reduction
                ratio = (preRed == 0) ? 0 : (actRed / preRed);

                // update the step bound
                if (ratio <= 0.25) {
                    var tmp =
                        (actRed < 0) ? (0.5 * dirDer / (dirDer + 0.5 * actRed)) : 0.5;
                        if ((0.1 * currentCost >= previousCost) || (tmp < 0.1)) {
                            tmp = 0.1;
                        }
                        delta = tmp * Math.min(delta, 10.0 * lmNorm);
                        this.lmPar /= tmp;
                } else if ((this.lmPar == 0) || (ratio >= 0.75)) {
                    delta = 2 * lmNorm;
                    this.lmPar *= 0.5;
                }

                // test for successful iteration.
                if (ratio >= 1.0e-4) {
                    // successful iteration, update the norm
                    firstIteration = false;
                    xNorm = 0;
                    for (var k = 0; k < nC; ++k) {
                        var xK = diag[k] * currentPoint[k];
                        xNorm += xK * xK;
                    }
                    xNorm = Math.sqrt(xNorm);

                    // tests for convergence.
                    if (this.checker != null) {
                        // we use the vectorial convergence checker
                        if (this.checker.call(iter, previous, current)) {
                            this.setCost(currentCost);
                            return current;
                        }
                    }
                } else {
                    // failed iteration, reset the previous values
                    currentCost = previousCost;
                    for (var j = 0; j < this.solvedCols; ++j) {
                        var pj = this.permutation[j];
                        currentPoint[pj] = oldX[pj];
                    }
                    tmpVec    = this.weightedResidual;
                    this.weightedResidual = oldRes;
                    oldRes    = tmpVec;
                    tmpVec    = currentObjective;
                    currentObjective = oldObj;
                    oldObj    = tmpVec;
                    // Reset "current" to previous values.
                    current = [currentPoint, currentObjective];
                }

                // Default convergence criteria.
                if ((Math.abs(actRed) <= this.costRelativeTolerance &&
                     preRed <= this.costRelativeTolerance &&
                     ratio <= 2.0) ||
                    delta <= this.parRelativeTolerance * xNorm) {
                    this.setCost(currentCost);
                    return current;
                }

                // tests for termination and stringent tolerances
                // (2.2204e-16 is the machine epsilon for IEEE754)
                if ((Math.abs(actRed) <= 2.2204e-16) && (preRed <= 2.2204e-16) && (ratio <= 2.0)) {
                    throw "TOO_SMALL_COST_RELATIVE_TOLERANCE: " + this.costRelativeTolerance;
                } else if (delta <= 2.2204e-16 * xNorm) {
                    throw "TOO_SMALL_PARAMETERS_RELATIVE_TOLERANCE: " + this.parRelativeTolerance;
                } else if (maxCosine <= 2.2204e-16)  {
                    throw "TOO_SMALL_ORTHOGONALITY_TOLERANCE: " + this.orthoTolerance;
                }
            }
        }
    }

    /**
     * Determine the Levenberg-Marquardt parameter.
     * <p>This implementation is a translation in Java of the MINPACK
     * <a href="http://www.netlib.org/minpack/lmpar.f">lmpar</a>
     * routine.</p>
     * <p>This method sets the lmPar and lmDir attributes.</p>
     * <p>The authors of the original fortran function are:</p>
     * <ul>
     *   <li>Argonne National Laboratory. MINPACK project. March 1980</li>
     *   <li>Burton  S. Garbow</li>
     *   <li>Kenneth E. Hillstrom</li>
     *   <li>Jorge   J. More</li>
     * </ul>
     * <p>Luc Maisonobe did the Java translation.</p>
     *
     * @param qy array containing qTy
     * @param delta upper bound on the euclidean norm of diagR * lmDir
     * @param diag diagonal matrix
     * @param work1 work array
     * @param work2 work array
     * @param work3 work array
     */
    this.determineLMParameter = function(qy, delta, diag,
                                         work1, work2, work3) {
        var nC = this.weightedJacobian[0].length;

        // compute and store in x the gauss-newton direction, if the
        // jacobian is rank-deficient, obtain a least squares solution
        for (var j = 0; j < this.rank; ++j) {
            this.lmDir[this.permutation[j]] = qy[j];
        }
        for (var j = this.rank; j < nC; ++j) {
            this.lmDir[this.permutation[j]] = 0;
        }
        for (var k = this.rank - 1; k >= 0; --k) {
            var pk = this.permutation[k];
            var ypk = this.lmDir[pk] / this.diagR[pk];
            for (var i = 0; i < k; ++i) {
                this.lmDir[this.permutation[i]] -= ypk * this.weightedJacobian[i][pk];
            }
            this.lmDir[pk] = ypk;
        }

        // evaluate the function at the origin, and test
        // for acceptance of the Gauss-Newton direction
        var dxNorm = 0;
        for (var j = 0; j < this.solvedCols; ++j) {
            var pj = this.permutation[j];
            var s = diag[pj] * this.lmDir[pj];
            work1[pj] = s;
            dxNorm += s * s;
        }
        dxNorm = Math.sqrt(dxNorm);
        var fp = dxNorm - delta;
        if (fp <= 0.1 * delta) {
            this.lmPar = 0;
            return;
        }

        // if the jacobian is not rank deficient, the Newton step provides
        // a lower bound, parl, for the zero of the function,
        // otherwise set this bound to zero
        var sum2;
        var parl = 0;
        if (this.rank == this.solvedCols) {
            for (var j = 0; j < this.solvedCols; ++j) {
                var pj = this.permutation[j];
                work1[pj] *= diag[pj] / dxNorm;
            }
            sum2 = 0;
            for (var j = 0; j < this.solvedCols; ++j) {
                var pj = this.permutation[j];
                var sum = 0;
                for (var i = 0; i < j; ++i) {
                    sum += this.weightedJacobian[i][pj] * work1[this.permutation[i]];
                }
                var s = (work1[pj] - sum) / this.diagR[pj];
                work1[pj] = s;
                sum2 += s * s;
            }
            parl = fp / (delta * sum2);
        }

        // calculate an upper bound, paru, for the zero of the function
        sum2 = 0;
        for (var j = 0; j < this.solvedCols; ++j) {
            var pj = this.permutation[j];
            var sum = 0;
            for (var i = 0; i <= j; ++i) {
                sum += this.weightedJacobian[i][pj] * qy[i];
            }
            sum /= diag[pj];
            sum2 += sum * sum;
        }
        var gNorm = Math.sqrt(sum2);
        var paru = gNorm / delta;
        if (paru == 0) {
            // 2.2251e-308 is the smallest positive real for IEE754
            paru = 2.2251e-308 / Math.min(delta, 0.1);
        }

        // if the input par lies outside of the interval (parl,paru),
        // set par to the closer endpoint
        this.lmPar = Math.min(paru, Math.max(this.lmPar, parl));
        if (this.lmPar == 0) {
            this.lmPar = gNorm / dxNorm;
        }

        for (var countdown = 10; countdown >= 0; --countdown) {

            // evaluate the function at the current value of lmPar
            if (this.lmPar == 0) {
                this.lmPar = Math.max(2.2251e-308, 0.001 * paru);
            }
            var sPar = Math.sqrt(this.lmPar);
            for (var j = 0; j < this.solvedCols; ++j) {
                var pj = this.permutation[j];
                work1[pj] = sPar * diag[pj];
            }
            this.determineLMDirection(qy, work1, work2, work3);

            dxNorm = 0;
            for (var j = 0; j < this.solvedCols; ++j) {
                var pj = this.permutation[j];
                var s = diag[pj] * this.lmDir[pj];
                work3[pj] = s;
                dxNorm += s * s;
            }
            dxNorm = Math.sqrt(dxNorm);
            var previousFP = fp;
            fp = dxNorm - delta;

            // if the function is small enough, accept the current value
            // of lmPar, also test for the exceptional cases where parl is zero
            if ((Math.abs(fp) <= 0.1 * delta) ||
                    ((parl == 0) && (fp <= previousFP) && (previousFP < 0))) {
                return;
            }

            // compute the Newton correction
            for (var j = 0; j < this.solvedCols; ++j) {
                var pj = this.permutation[j];
                work1[pj] = work3[pj] * diag[pj] / dxNorm;
            }
            for (var j = 0; j < this.solvedCols; ++j) {
                var pj = this.permutation[j];
                work1[pj] /= work2[j];
                var tmp = work1[pj];
                for (var i = j + 1; i < this.solvedCols; ++i) {
                    work1[this.permutation[i]] -= this.weightedJacobian[i][pj] * tmp;
                }
            }
            sum2 = 0;
            for (var j = 0; j < this.solvedCols; ++j) {
                var s = work1[this.permutation[j]];
                sum2 += s * s;
            }
            var correction = fp / (delta * sum2);

            // depending on the sign of the function, update parl or paru.
            if (fp > 0) {
                parl = Math.max(parl, this.lmPar);
            } else if (fp < 0) {
                paru = Math.min(paru, this.lmPar);
            }

            // compute an improved estimate for lmPar
            this.lmPar = Math.max(parl, this.lmPar + correction);

        }
    }

    /**
     * Solve a*x = b and d*x = 0 in the least squares sense.
     * <p>This implementation is a translation in Java of the MINPACK
     * <a href="http://www.netlib.org/minpack/qrsolv.f">qrsolv</a>
     * routine.</p>
     * <p>This method sets the lmDir and lmDiag attributes.</p>
     * <p>The authors of the original fortran function are:</p>
     * <ul>
     *   <li>Argonne National Laboratory. MINPACK project. March 1980</li>
     *   <li>Burton  S. Garbow</li>
     *   <li>Kenneth E. Hillstrom</li>
     *   <li>Jorge   J. More</li>
     * </ul>
     * <p>Luc Maisonobe did the Java translation.</p>
     *
     * @param qy array containing qTy
     * @param diag diagonal matrix
     * @param lmDiag diagonal elements associated with lmDir
     * @param work work array
     */
    this.determineLMDirection = function(qy, diag, lmDiag, work) {

        // copy R and Qty to preserve input and initialize s
        //  in particular, save the diagonal elements of R in lmDir
        for (var j = 0; j < this.solvedCols; ++j) {
            var pj = this.permutation[j];
            for (var i = j + 1; i < this.solvedCols; ++i) {
                this.weightedJacobian[i][pj] = this.weightedJacobian[j][this.permutation[i]];
            }
            this.lmDir[j] = this.diagR[pj];
            work[j]  = qy[j];
        }

        // eliminate the diagonal matrix d using a Givens rotation
        for (var j = 0; j < this.solvedCols; ++j) {

            // prepare the row of d to be eliminated, locating the
            // diagonal element using p from the Q.R. factorization
            var pj = this.permutation[j];
            var dpj = diag[pj];
            if (dpj != 0) {
                Arrays_fill(lmDiag, j + 1, lmDiag.length, 0);
            }
            lmDiag[j] = dpj;

            //  the transformations to eliminate the row of d
            // modify only a single element of Qty
            // beyond the first n, which is initially zero.
            var qtbpj = 0;
            for (var k = j; k < this.solvedCols; ++k) {
                var pk = this.permutation[k];

                // determine a Givens rotation which eliminates the
                // appropriate element in the current row of d
                if (lmDiag[k] != 0) {

                    var sin;
                    var cos;
                    var rkk = this.weightedJacobian[k][pk];
                    if (Math.abs(rkk) < Math.abs(lmDiag[k])) {
                        var cotan = rkk / lmDiag[k];
                        sin   = 1.0 / Math.sqrt(1.0 + cotan * cotan);
                        cos   = sin * cotan;
                    } else {
                        var tan = lmDiag[k] / rkk;
                        cos = 1.0 / Math.sqrt(1.0 + tan * tan);
                        sin = cos * tan;
                    }

                    // compute the modified diagonal element of R and
                    // the modified element of (Qty,0)
                    this.weightedJacobian[k][pk] = cos * rkk + sin * lmDiag[k];
                    var temp = cos * work[k] + sin * qtbpj;
                    qtbpj = -sin * work[k] + cos * qtbpj;
                    work[k] = temp;

                    // accumulate the tranformation in the row of s
                    for (var i = k + 1; i < this.solvedCols; ++i) {
                        var rik = this.weightedJacobian[i][pk];
                        var temp2 = cos * rik + sin * lmDiag[i];
                        lmDiag[i] = -sin * rik + cos * lmDiag[i];
                        this.weightedJacobian[i][pk] = temp2;
                    }
                }
            }

            // store the diagonal element of s and restore
            // the corresponding diagonal element of R
            lmDiag[j] = this.weightedJacobian[j][this.permutation[j]];
            this.weightedJacobian[j][this.permutation[j]] = this.lmDir[j];
        }

        // solve the triangular system for z, if the system is
        // singular, then obtain a least squares solution
        var nSing = this.solvedCols;
        for (var j = 0; j < this.solvedCols; ++j) {
            if ((lmDiag[j] == 0) && (nSing == this.solvedCols)) {
                nSing = j;
            }
            if (nSing < this.solvedCols) {
                work[j] = 0;
            }
        }
        if (nSing > 0) {
            for (var j = nSing - 1; j >= 0; --j) {
                var pj = this.permutation[j];
                var sum = 0;
                for (var i = j + 1; i < nSing; ++i) {
                    sum += this.weightedJacobian[i][pj] * work[i];
                }
                work[j] = (work[j] - sum) / lmDiag[j];
            }
        }

        // permute the components of z back to components of lmDir
        for (var j = 0; j < this.lmDir.length; ++j) {
            this.lmDir[this.permutation[j]] = work[j];
        }
    }

    /**
     * Decompose a matrix A as A.P = Q.R using Householder transforms.
     * <p>As suggested in the P. Lascaux and R. Theodor book
     * <i>Analyse num&eacute;rique matricielle appliqu&eacute;e &agrave;
     * l'art de l'ing&eacute;nieur</i> (Masson, 1986), instead of representing
     * the Householder transforms with u<sub>k</sub> unit vectors such that:
     * <pre>
     * H<sub>k</sub> = I - 2u<sub>k</sub>.u<sub>k</sub><sup>t</sup>
     * </pre>
     * we use <sub>k</sub> non-unit vectors such that:
     * <pre>
     * H<sub>k</sub> = I - beta<sub>k</sub>v<sub>k</sub>.v<sub>k</sub><sup>t</sup>
     * </pre>
     * where v<sub>k</sub> = a<sub>k</sub> - alpha<sub>k</sub> e<sub>k</sub>.
     * The beta<sub>k</sub> coefficients are provided upon exit as recomputing
     * them from the v<sub>k</sub> vectors would be costly.</p>
     * <p>This decomposition handles rank deficient cases since the tranformations
     * are performed in non-increasing columns norms order thanks to columns
     * pivoting. The diagonal elements of the R matrix are therefore also in
     * non-increasing absolute values order.</p>
     *
     * @param jacobian Weighted Jacobian matrix at the current point.
     * @exception ConvergenceException if the decomposition cannot be performed
     */
    this.qrDecomposition = function(jacobian) {
        // Code in this class assumes that the weighted Jacobian is -(W^(1/2) J),
        // hence the multiplication by -1.
        this.weightedJacobian = this.scalarMultiply(jacobian, -1);

        var nR = this.weightedJacobian.length;
        var nC = this.weightedJacobian[0].length;

        // initializations
        for (var k = 0; k < nC; ++k) {
            this.permutation[k] = k;
            var norm2 = 0;
            for (var i = 0; i < nR; ++i) {
                var akk = this.weightedJacobian[i][k];
                norm2 += akk * akk;
            }
            this.jacNorm[k] = Math.sqrt(norm2);
        }

        // transform the matrix column after column
        for (var k = 0; k < nC; ++k) {

            // select the column with the greatest norm on active components
            var nextColumn = -1;
            var ak2 = Number.NEGATIVE_INFINITY;
            for (var i = k; i < nC; ++i) {
                var norm2 = 0;
                for (var j = k; j < nR; ++j) {
                    var aki = this.weightedJacobian[j][this.permutation[i]];
                    norm2 += aki * aki;
                }
                if (!isFinite(norm2)) {
                    throw "UNABLE_TO_PERFORM_QR_DECOMPOSITION_ON_JACOBIAN";
                }
                if (norm2 > ak2) {
                    nextColumn = i;
                    ak2        = norm2;
                }
            }
            if (ak2 <= this.qrRankingThreshold) {
                this.rank = k;
                return;
            }
            var pk                  = this.permutation[nextColumn];
            this.permutation[nextColumn] = this.permutation[k];
            this.permutation[k]          = pk;

            // choose alpha such that Hk.u = alpha ek
            var akk   = this.weightedJacobian[k][pk];
            var alpha = (akk > 0) ? -Math.sqrt(ak2) : Math.sqrt(ak2);
            var betak = 1.0 / (ak2 - akk * alpha);
            this.beta[pk]     = betak;

            // transform the current column
            this.diagR[pk]        = alpha;
            this.weightedJacobian[k][pk] -= alpha;

            // transform the remaining columns
            for (var dk = nC - 1 - k; dk > 0; --dk) {
                var gamma = 0;
                for (var j = k; j < nR; ++j) {
                    gamma += this.weightedJacobian[j][pk] * this.weightedJacobian[j][this.permutation[k + dk]];
                }
                gamma *= betak;
                for (var j = k; j < nR; ++j) {
                    this.weightedJacobian[j][this.permutation[k + dk]] -= gamma * this.weightedJacobian[j][pk];
                }
            }
        }
        this.rank = this.solvedCols;
    }

    /**
     * Compute the product Qt.y for some Q.R. decomposition.
     *
     * @param y vector to multiply (will be overwritten with the result)
     */
    this.qTy = function(y) {
        var nR = this.weightedJacobian.length;
        var nC = this.weightedJacobian[0].length;

        for (var k = 0; k < nC; ++k) {
            var pk = this.permutation[k];
            var gamma = 0;
            for (var i = k; i < nR; ++i) {
                gamma += this.weightedJacobian[i][pk] * y[i];
            }
            gamma *= this.beta[pk];
            for (var i = k; i < nR; ++i) {
                y[i] -= gamma * this.weightedJacobian[i][pk];
            }
        }
    }

    /**
     * Computes the weighted Jacobian matrix.
     *
     * @param params Model parameters at which to compute the Jacobian.
     * @return the weighted Jacobian: W<sup>1/2</sup> J.
     * @throws DimensionMismatchException if the Jacobian dimension does not
     * match problem dimension.
     */
    this.computeWeightedJacobian = function(params) {
//        return this.weightMatrixSqrt.multiply(this.jacobian(params));

      //TODO: since weighted matrix is always identity return jacobian itself
        return this.jacobian(params);
    }

    this.scalarMultiply = function(m, s) {
        var rowCount    = m.length;
        var columnCount = m[0].length;
        var out = [];
        for (var row = 0; row < rowCount; ++row) {
            out.push([]);
            for (var col = 0; col < columnCount; ++col) {
                out[row].push(m[row][col] * s);
            }
        }

        return out;
    }

    this.operate = function(m, v) {
        var nRows = m.length;
        var nCols = m[0].length;
        if (v.length != nCols) {
            throw "DimensionMismatchException: " + v.length + "!=" + nCols;
        }
        var out = [];
        for (var row = 0; row < nRows; row++) {
            var dataRow = m[row];
            var sum = 0;
            for (var i = 0; i < nCols; i++) {
                sum += dataRow[i] * v[i];
            }
            out[row] = sum;
        }
        return out;
    }

    /**
     * Computes the cost.
     *
     * @param residuals Residuals.
     * @return the cost.
     * @see #computeResiduals(double[])
     */
    this.computeCost = function(residuals) {
        return Math.sqrt(this.dotProduct( residuals, this.operate(this.getWeight(), residuals)));
    }


    this.dotProduct = function(v1, v2) {
      var dot = 0;
      for (var i = 0; i < v1.length; i++) {
          dot += v1[i] * v2[i];
      }
      return dot;
    }

    /**
     * Gets the root-mean-square (RMS) value.
     *
     * The RMS the root of the arithmetic mean of the square of all weighted
     * residuals.
     * This is related to the criterion that is minimized by the optimizer
     * as follows: If <em>c</em> if the criterion, and <em>n</em> is the
     * number of measurements, then the RMS is <em>sqrt (c/n)</em>.
     *
     * @return the RMS value.
     */
    this.getRMS = function() {
        return Math.sqrt(this.getChiSquare() / this.target.length);
    }

    /**
     * Get a Chi-Square-like value assuming the N residuals follow N
     * distinct normal distributions centered on 0 and whose variances are
     * the reciprocal of the weights.
     * @return chi-square value
     */
    this.getChiSquare = function() {
        return this.cost * this.cost;
    }

    /**
     * Gets the square-root of the weight matrix.
     *
     * @return the square-root of the weight matrix.
     */
    this.getWeightSquareRoot = function() {
        return this.weightMatrixSqrt;//.copy(); FIXME for now it's always identity
    }

    this.getWeight = function() {
        return this.weightMatrix;//.copy(); FIXME for now it's always identity
    }

    /**
     * Sets the cost.
     *
     * @param cost Cost value.
     */
    this.setCost = function(cost) {
        this.cost = cost;
    }

    /**
     * Computes the residuals.
     * The residual is the difference between the observed (target)
     * values and the model (objective function) value.
     * There is one residual for each element of the vector-valued
     * function.
     *
     * @param objectiveValue Value of the the objective function. This is
     * the value returned from a call to
     * {@link #computeObjectiveValue(double[]) computeObjectiveValue}
     * (whose array argument contains the model parameters).
     * @return the residuals.
     * @throws DimensionMismatchException if {@code params} has a wrong
     * length.
     */
    this.computeResiduals = function(objectiveValue) {
        var target = this.target;
        if (objectiveValue.length != target.length) {
            throw "DimensionMismatchException: " + target.length + " != " + objectiveValue.length;
        }

        var residuals = arr(target.length);
        for (var i = 0; i < target.length; i++) {
            residuals[i] = target[i] - objectiveValue[i];
        }

        return residuals;
    }

    this.computeObjectiveValue = function(params) {
        if (++this.evalCount > this.evalMaximalCount) {
            throw "TOO MANY FUNCTION EVALUATION"
        }
        return this.model(params);
    }

}
