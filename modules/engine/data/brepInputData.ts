import {SurfaceData} from "./surfaceData";
import {CurveData} from "./curveData";
import {Vec3} from "math/vec";
import {SurfaceType} from "engine/data/brepOutputData";

export interface BrepInputFaceData {
  surface?: string;
  loops: string[][];
  inverted?: boolean;
}

export interface BrepInputEdgeData {
  a: string;
  b: string;
  curve?: string;
}

export interface BrepInputData {

  vertices: {
    [id: string]: Vec3;
  },

  curves?: {
    [id: string]: CurveData;
  },

  surfaces?: {
    [id: string]: SurfaceType;
  };

  edges: {
    [id: string]: BrepInputEdgeData;
  };

  faces: BrepInputFaceData[];

}

export const CubeExample: () => BrepInputData = () => ({
  vertices: {
    A: [0,-100,750],
    B: [500,0,500],
    C: [500,500,500],
    D: [0,500,500],

    AA: [0,0,0],
    BB: [500,0,0],
    CC: [500,500,0],
    DD: [0,500,0]
  },

  // curves: {},
  surfaces: {
    top: {
      TYPE: 'PLANE',
      normal: [0,0,1],
      origin: [0,0,500]
    },
    bottom: {
      TYPE: 'PLANE',
      normal: [0,0,-1],
      origin: [0,0,0]
    },
    wall1: {
      TYPE: 'PLANE',
      normal: [0,-1,0],
      origin: [0,0,0]
    },
    wall2: {
      TYPE: 'PLANE',
      normal: [1,0,0],
      origin: [500,0,0]
    },
    wall3: {
      TYPE: 'PLANE',
      normal: [0,1,0],
      origin: [0,500,0]
    },
    wall4: {
      TYPE: 'PLANE',
      normal: [-1,0,0],
      origin: [0,0,0]
    },
  },

  edges: {
    AB: {a: 'A', b: 'B'},
    BC: {a: 'B', b: 'C'},
    CD: {a: 'C', b: 'D'},
    DA: {a: 'D', b: 'A'},

    AA_BB: {a: 'AA', b: 'BB'},
    BB_CC: {a: 'BB', b: 'CC'},
    CC_DD: {a: 'CC', b: 'DD'},
    DD_AA: {a: 'DD', b: 'AA'},

    A_AA: {a: 'A', b: 'AA'},
    B_BB: {a: 'B', b: 'BB'},
    C_CC: {a: 'C', b: 'CC'},
    D_DD: {a: 'D', b: 'DD'},
  },

  faces: [
    {
      surface: 'top',
      plate: true,
      loops: [
        ['AB', 'BC', 'CD', 'DA']]
    },
    {
      surface: 'bottom',
      loops: [['AA_BB', 'BB_CC', 'CC_DD', 'DD_AA']]
    },
    {
      surface: 'wall1',
      loops: [['AB', 'B_BB', 'AA_BB', 'A_AA']]
    },
    {
      surface: 'wall2',
      loops: [['BC', 'C_CC', 'BB_CC', 'B_BB']]
    },
    {
      surface: 'wall3',
      loops: [['CD', 'D_DD', 'CC_DD', 'C_CC']]
    },
    {
      surface: 'wall4',
      loops: [['DA', 'A_AA', 'DD_AA', 'D_DD']]
    },
  ]

});
