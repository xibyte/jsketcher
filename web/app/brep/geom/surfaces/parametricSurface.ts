import {Matrix3x4Data} from "math/matrix";
import {Vec3} from "math/vec";

export type UV = [number, number];

export interface ParametricSurface {

  domainU: [number, number];
  domainV: [number, number];

  knotsU: number[];
  knotsV: number[];

  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  isMirrored: boolean;

  degreeU(): number;
  degreeV(): number;

  eval(u: number, v: number, num: number): number[][];

  point(u: number, v: number): Vec3;

  param(point: number[]): UV;

  transform(tr: Matrix3x4Data): ParametricSurface;

  normal(u:number, v:number): Vec3;
  
}

