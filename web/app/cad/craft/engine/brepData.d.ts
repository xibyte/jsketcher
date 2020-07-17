import {Vec3} from "math/l3space";
import {Tessellation1D, Tessellation2D} from "./tessellation";
import {ProductionInfo} from "./productionInfo";
import {Handle} from "./handle";
import {SurfaceBSplineData, SurfacePlaneData, SurfaceUnknownData} from "./surfaceData";
import {CurveBSplineData, CurveLineData, CurveUnknownData} from "./curveData";

export interface BREPData {

  error: boolean;

  ptr: Handle;

  faces: FaceData[]

}

export interface FaceData {

  ref: number;

  ptr: Handle;

  surface: SurfacePlaneData | SurfaceBSplineData | SurfaceUnknownData;
  inverted: boolean;
  tess?: Tessellation2D<Vec3>;
  productionInfo: ProductionInfo;

  loops: EdgeData[][];
}

export interface EdgeData {

  ptr: Handle;
  edgeRef: number;

  a: Vec3;
  b: Vec3;

  inverted: boolean;
  curveBounds: [number, number];

  curve: CurveLineData | CurveBSplineData | CurveUnknownData;

  tess?: Tessellation1D<Vec3>;

}


