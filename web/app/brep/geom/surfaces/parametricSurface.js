// @flow
interface ParametricSurface {

  domainU: number[];
  domainV: number[];

  knotsU: number[];
  knotsV: number[];

  degreeU(): number;
  degreeV(): number;

  eval(u: number, v: number, num: number): number[][];

  point(param: number): number[];

  param(point: number[]): number[];

  transform(tr);

  normal(u:number, v:number): number[];
  
}

