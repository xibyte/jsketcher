import {Vec3} from "math/vec";
import {NurbsCurveData} from "geom/curves/nurbsCurveData";

export enum PRIMITIVE_TYPES {
  SEGMENT = 1,
  B_SPLINE,
  CIRCLE,
  ARC
}

export interface CirclePrimitiveData {
  TYPE: PRIMITIVE_TYPES.CIRCLE;
  c: Vec3;
  r: number;
  dir: Vec3;
}

export interface ArcPrimitiveData {
  TYPE: PRIMITIVE_TYPES.ARC;
  a: Vec3;
  b: Vec3;
  tangent: Vec3;
}

export interface BSplinePrimitiveData extends NurbsCurveData {
  TYPE: PRIMITIVE_TYPES.B_SPLINE;
}

export interface SegmentPrimitiveData extends NurbsCurveData {
  TYPE: PRIMITIVE_TYPES.SEGMENT;
  a: Vec3;
  b: Vec3;
}

export type PrimitiveData = SegmentPrimitiveData | CirclePrimitiveData | ArcPrimitiveData | BSplinePrimitiveData;