import {Vec3} from "math/vec";

export type CurveData = CurveBSplineData | CurveLineData | CurveUnknownData;

export interface CurveBSplineData {

  TYPE: "B-SPLINE";

  degree?: number;

  //backward compat
  deg?: number;

  knots: number[];
  weights: number[];
  cp: Vec3[];

}

export interface CurveLineData {

  TYPE: "LINE";

  a: Vec3;
  b: Vec3;

}
export interface CurveUnknownData {

  TYPE: "UNKNOWN";

}