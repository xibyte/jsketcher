import * as vec from 'math/vec';
import newtonIterations, {newtonIterationsOnInterval} from './newtonIterations';
import {curveTessParams} from '../impl/curve/curve-tess';

export function closestToCurveParam(curve, pt) {
  const [intMin, intMax] = findClosestToCurveInterval(curve, pt)
  return solveClosestToCurveParamExactly(curve, pt, intMin, intMax)
}

export function findClosestToCurveInterval(curve, pt) {
  const [uMin, uMax] = curve.domain();
  const chunks = curveTessParams(curve, uMin, uMax, 10);
  let heroDist = -1;
  let hero = -1;
  for (let i = 1; i < chunks.length; ++i) {
    const startParam = chunks[i - 1];
    const endParam = chunks[i];
    const a = curve.point(startParam);
    const b = curve.point(endParam);

    const dist = distanceSqToSegment(a, b, pt);
    if (hero === -1 || dist < heroDist) {
      heroDist = dist;
      hero = i;
    }
  }
  return [chunks[hero - 1], chunks[hero]];
}

function distanceSqToSegment(a, b, pt) {
  const ab = vec.sub(b, a);
  const test = vec.sub(pt, a);
  const abLength = vec.length(ab);
  const abUnit = vec._div(ab, abLength);
  const proj = vec.dot(abUnit, test);
  if (proj <= 0) {
    return vec.distanceSq(a, pt);
  } else if (proj >= abLength) {
    return vec.distanceSq(b, pt);
  } else {
    const projV = vec._mul(abUnit, proj);
    return vec.distanceSq(test, projV)
  }
}


export function solveClosestToCurveParamExactly(curve, pt, intMin, intMax, tol) {

  //solving minimization problem of squared distance 
  
  //f(u) = (fx(u) - x)^2 + (fy(u) - y)^2 + (fz(u) - z)^2 = fx^2 - 2*fx*x + x^2 ...  

  //f'(u) = 2*fx*f'x - 2*x*f'x ...  
  //f''(u) = 2*fx*f''x + 2*f'x*f'x - 2*x*f''x...  

  const X=0, Y=1, Z=2;
  function squareDistanceFn(u) {
    
    const [f, d1, d2] = curve.eval(u, 2);
    
    const r1Comp = i => 2 * f[i] * d1[i] - 2 * pt[i] * d1[i];
    const r2Comp = i => 2 * f[i] * d2[i] + 2 * d1[i] * d1[i] - 2 * pt[i] * d2[i];

    const r1 = r1Comp(X) + r1Comp(Y) + r1Comp(Z); 
    const r2 = r2Comp(X) + r2Comp(Y) + r2Comp(Z);
    
    return [r1, r2];
  }
  
  return newtonIterationsOnInterval(squareDistanceFn, intMin, intMax, tol);
}

