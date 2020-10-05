import {Vec3} from "math/vec";

export interface CurveData {

  TYPE: string;

}

export interface CurveBSplineData extends CurveData {

  TYPE: "B-SPLINE";

  degree?: number;

  //backward compat
  deg?: number;

  knots: number[];
  weights: number[];
  cp: Vec3[];

}

export interface CurveLineData extends CurveData {

  TYPE: "LINE";

}
export interface CurveUnknownData extends CurveData {

  TYPE: "UNKNOWN";

}