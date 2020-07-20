/**
 * fnEval returns an array containing either
 * 
 * a function value and it's derivative to find it's roots
 * 
 *   or
 * 
 * a first derivative and second derivative to 
 * solve minimization problem(finding stationary points = finding roots of the first derivative)
 */
export default function newtonIterations(fnEval, x0, tol) {

  tol = tol || 1e-6;

  let x = x0;
  
  for (let i = 0; i < MAX_IT; i++) {
    let [fValue, dValue] = fnEval(x);
    if (Math.abs(fValue) <= tol) {
      return x;
    }
    x -= fValue / dValue;
  }
  return x;
}

export function newtonIterationsOnInterval(fnEval, a, b, tol) {

  tol = tol || 1e-6;

  let x = a + (b - a) * 0.5;

  for (let i = 0; i < MAX_IT; i++) {
    let [fValue, dValue] = fnEval(x);
    if (Math.abs(fValue) <= tol) {
      return x;
    }
    let newX = x - fValue / dValue;
    newX = Math.min(b, Math.max(a, newX));
    if (Math.abs(newX - x) <= tol) {
      return x;
    }
    x = newX;
  }
  return x;
}

export function newtonIterationsOnIntervalExcluding(fnEval, a, b, tol) {

  tol = tol || 1e-6;

  const sq = v => v * v;
  const xFn = t => a + (b-a)/(1 + Math.exp(-t));

  const xDer = t => {
    let et = Math.exp(-t);
    return et*(b-a)/sq(et+1);
  };


  let t = 0;
  let x = xFn(t);
  for (let i = 0; i < MAX_IT; i++) {
    let [fValue, dValue] = fnEval(x);
    
    if (Math.abs(fValue) <= tol) {
      return x;
    }
    t -= fValue / (xDer(t) * dValue);
    x = xFn(t);
  }
  return x;
}


const MAX_IT = 100;