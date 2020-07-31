import {SurfaceData} from "./surfaceData";
import {CurveData} from "./curveData";
import {Vec3} from "math/vec";

export interface BrepInputData {

  vertices: {
    [id: string]: Vec3;
  },

  curves?: {
    [id: string]: CurveData;
  },

  surfaces?: {
    [id: string]: SurfaceData;
  };

  edges: {
    [id: string]: {
      a: string;
      b: string;
      curve?: string;
      inverted?: boolean;
    };
  };

  faces: {
    surface?: string;
    loops: string[][];
  }[];

}
