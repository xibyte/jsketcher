import {Vec3} from "math/l3space";
import {Matrix3x4Data} from "math/matrix";

export interface ParametricCurve {

  domain(): [number, number];

  degree(): number;
  
  eval(u: number, num: number): Vec3[];

  point(param: number): Vec3;

  param(point: Vec3): number;

  transform(tr: Matrix3x4Data): ParametricCurve;

  knots(): number[];

  invert(): ParametricCurve;

  split(u: number): [ParametricCurve, ParametricCurve];
}

