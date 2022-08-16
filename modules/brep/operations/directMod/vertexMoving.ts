import { ApplicationContext } from "cad/context";
import { BrepInputData } from "engine/data/brepInputData";
import CSys from "math/csys";
import Vector, { AXIS } from "math/vector";
import DatumObject3D from "../../../../web/app/cad/craft/datum/datumObject";
import { readShellEntityFromJson } from "../../../../web/app/cad/scene/wrappers/entityIO";


export function testVertexMoving(ctx: ApplicationContext) {


  function step(cornerPoint) {

    ctx.craftService.models$.update((models) => {
      const data = ctx.craftEngine.modellingEngine.loadModel(makeCube(cornerPoint));
      const mShell = readShellEntityFromJson(data);
      return [mShell];
    });

  }

  const datum3D = new DatumObject3D(
    new CSys(new Vector(0,0,500), AXIS.X.copy(), AXIS.Y.copy(), AXIS.Z.copy()),   
    ctx.services.viewer);

  datum3D.onMove = (begin, end, delta) => {
    step(end);    
  };
  ctx.services.cadScene.workGroup.add(datum3D);

  step(new Vector(0, 0, 500));

  // data = ctx.craftEngine.modellingEngine.transform({
  //   model: data.ptr,
  //   matrix: new Matrix3x4().scale(1,2,1).toFlatArray()
  // });

  // const shell = mShell.brepShell as Shell;
  // // shell.transform(new Matrix3x4().scale(1,2,1));

  // const scaledInput = writeBrep(shell);
  // console.dir(scaledInput);
  // let data2 = ctx.craftEngine.modellingEngine.loadModel(scaledInput);

  // const mShell2 = readShellEntityFromJson(data2);


}


function makeCube({x, y, z}): BrepInputData {

  return {
    vertices: {
      A: [x, y, z],
      B: [500, 0, 500],
      C: [500, 500, 500],
      D: [0, 500, 500],

      AA: [0, 0, 0],
      BB: [500, 0, 0],
      CC: [500, 500, 0],
      DD: [0, 500, 0],
      
    },

    // curves: {},
    surfaces: {
      top: {
        TYPE: 'PLANE',
        normal: [0, 0, 1],
        origin: [0, 0, 500]
      },
      bottom: {
        TYPE: 'PLANE',
        normal: [0, 0, -1],
        origin: [0, 0, 0]
      },
      wall1: {
        TYPE: 'PLANE',
        normal: [0, -1, 0],
        origin: [0, 0, 0]
      },
      wall2: {
        TYPE: 'PLANE',
        normal: [1, 0, 0],
        origin: [500, 0, 0]
      },
      wall3: {
        TYPE: 'PLANE',
        normal: [0, 1, 0],
        origin: [0, 500, 0]
      },
      wall4: {
        TYPE: 'PLANE',
        normal: [-1, 0, 0],
        origin: [0, 0, 0]
      },
    },

    edges: {
      AB: { a: 'A', b: 'B' },
      BC: { a: 'B', b: 'C' },
      CD: { a: 'C', b: 'D' },
      DA: { a: 'D', b: 'A' },

      AA_BB: { a: 'AA', b: 'BB' },
      BB_CC: { a: 'BB', b: 'CC' },
      CC_DD: { a: 'CC', b: 'DD' },
      DD_AA: { a: 'DD', b: 'AA' },

      A_AA: { a: 'A', b: 'AA' },
      B_BB: { a: 'B', b: 'BB' },
      C_CC: { a: 'C', b: 'CC' },
      D_DD: { a: 'D', b: 'DD' },
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

  }
}
