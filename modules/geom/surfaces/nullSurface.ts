import {ParametricSurface, UV} from "./parametricSurface";
import {Matrix3x4Data} from "math/matrix";
import {Vec3} from "math/vec";

export default class NullSurface implements ParametricSurface {

  domainU: [number, number];
  domainV: [number, number];

  knotsU: number[];
  knotsV: number[];

  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  isMirrored: boolean;

  constructor() {
    this.domainU = [0, 1];
    this.domainV = [0, 1];
    this.knotsU = [0, 1];
    this.knotsV = [0, 1];
    this.isMirrored = false;
  }

  degreeU(): number {
    return 1;
  }

  degreeV(): number {
    return 1;
  }

  param(point: Vec3): UV {
    return [0, 0];
  }

  point(u: number, v: number): Vec3 {
    return [0, 0, 0];
  }

  eval(u: number, v: number, order: number): Vec3[] {
    return [[0, 0, 0]];
  }

  normal(u: number, v: number): Vec3 {
    return [0, 0, 1];
  }

  transform(tr: Matrix3x4Data): ParametricSurface {
    return this;
  }
}
