import {Vec3} from "math/vec";

export interface NurbsSurfaceData {
  degreeU: number,
  degreeV: number,
 	controlPoints: Vec3[][],
 	knots: number[][],
  weights: number[][]
}