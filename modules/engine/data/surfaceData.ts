import {Vec3} from "math/vec";

export interface SurfaceData {

  TYPE: string;

  direct: boolean;

}

export interface SurfacePlaneData extends SurfaceData {

  TYPE: 'PLANE';

  normal: Vec3,

  origin: Vec3;

}

export interface SurfaceBSplineData extends SurfaceData {

  TYPE: "B-SPLINE",

  degU: number
  degV: number
  knotsU: number[],
  knotsV: number[],
  weights: number[][],
  cp: Vec3[][]
}

export interface SurfaceUnknownData extends SurfaceData {

  TYPE: "UNKNOWN",

}