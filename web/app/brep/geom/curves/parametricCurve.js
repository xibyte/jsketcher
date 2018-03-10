// @flow
interface ParametricCurve {

  domain(): number[];

  degree(): number;
  
  degree1Tess(): number[][];

  eval(u: number, num: number): number[];  

  point(param: number): number[]; 

  param(point: number[]): number;

  transform(tr); 

  optimalSplits(): number;

  normalizeParametrization();

  invert();
}

