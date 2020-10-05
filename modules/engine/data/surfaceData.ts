import {Vec3} from "math/vec";

export interface SurfaceData {

  TYPE: string;
}

export interface SurfacePlaneData extends SurfaceData {

  TYPE: 'PLANE';

  normal: Vec3,

  origin: Vec3;

  direct?: boolean;
}

export interface SurfaceBSplineData extends SurfaceData {

  TYPE: "B-SPLINE"

  degreeU?: number
  degreeV?: number

  //backward compat
  degU?: number
  degV?: number

  knotsU: number[]
  knotsV: number[]
  weights: number[][]
  cp: Vec3[][]
}

export interface SurfaceUnknownData extends SurfaceData {

  TYPE: "UNKNOWN",

}