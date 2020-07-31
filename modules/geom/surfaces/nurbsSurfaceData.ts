import {Vec3} from "math/vec";

export interface NurbsSurfaceData {
  degreeU: number,
  degreeV: number,
  knotsV: number[];
  knotsU: number[];
  controlPoints: Vec3[][],
  weights: number[][]
}