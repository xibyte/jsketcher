import {newtonIterationsOnInterval} from '../curves/newtonIterations';

export function surfaceSurfaceStablePoints(surfaceA, surfaceB) {
  
  function impl(surfaceA, surfaceB) {

    //solving minimization problem of squared distance 

    //f(u) = (fx(u) - x)^2 + (fy(u) - y)^2 + (fz(u) - z)^2 = fx^2 - 2*fx*x + x^2 ...  

    //f'(u) = 2*fx*f'x - 2*x*f'x ...  
    //f''(u) = 2*fx*f''x + 2*f'x*f'x - 2*x*f''x...  

    const X=0, Y=1, Z=2;
    function squareDistanceFn(u) {

      let [f, d1, d2] = curve.eval(u, 2);

      let r1Comp = i => 2 * f[i] * d1[i] - 2 * pt[i] * d1[i];
      let r2Comp = i => 2 * f[i] * d2[i] + 2 * d1[i] * d1[i] - 2 * pt[i] * d2[i];

      let r1 = r1Comp(X) + r1Comp(Y) + r1Comp(Z);
      let r2 = r2Comp(X) + r2Comp(Y) + r2Comp(Z);

      return [r1, r2];
    }

    return newtonIterationsOnInterval(squareDistanceFn, intMin, intMax, tol);
    
  }
  
  
}