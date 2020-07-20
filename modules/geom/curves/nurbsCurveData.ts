import {Vec3} from "math/vec";

export interface NurbsCurveData {
  degree: number,
 	controlPoints: Vec3[],
 	knots: number[],
  weights: number[]
}