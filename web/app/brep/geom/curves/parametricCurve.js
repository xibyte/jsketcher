// @flow
interface ParametricCurve {

  domain(): number[];

  degree(): number;
  
  eval(u: number, num: number): number[];  

  point(param: number): number[]; 

  param(point: number[]): number;

  transform(tr);

  knots(): number[];

  invert();

  split(u: number);
}

