import BrepBuilder from 'brep/brep-builder'
import * as BREPPrimitives from 'brep/brep-primitives'
import BrepCurve from 'geom/curves/brepCurve';
import NurbsCurve from "geom/curves/nurbsCurve";
import {surfaceIntersect} from 'geom/intersection/surfaceSurface';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {createOctreeFromSurface, traverseOctree} from "voxels/octree";
import {Matrix3x4} from 'math/matrix';
import {AXIS, ORIGIN} from "math/vector";
import {BrepInputData} from "engine/data/brepInputData";
import {Vec3} from "math/vec";
import {ApplicationContext} from "context";
import {readShellEntityFromJson} from "./scene/wrappers/entityIO";

export function runSandbox(ctx: ApplicationContext) {

  const {services, services: { viewer, cadScene, cadRegistry, exposure, exposure: {addShellOnScene} }} = ctx;

  function test1() {

    const bb = new BrepBuilder();

    const a1 = bb.vertex(0, 0, 0);
    const b1 = bb.vertex(300, 0, 0);
    const c1 = bb.vertex(300, 300, 0);
    const d1 = bb.vertex(0, 300, 0);

    const a2 = bb.vertex(0, 0, 300);
    const b2 = bb.vertex(300, 0, 300);
    const c2 = bb.vertex(300, 300, 300);
    const d2 = bb.vertex(0, 300, 300);

    bb.face().loop([d1, c1, b1, a1]);
    bb.face().loop([a2, b2, c2, d2]);
    bb.face().loop([a1, b1, b2, a2]);
    bb.face().loop([b1, c1, c2, b2]);
    bb.face().loop([c1, d1, d2, c2]);
    bb.face().loop([d1, a1, a2, d2]);

    let result = bb.build();
    addShellOnScene(result);
  }

  function cylTest() {

    const cylinder1 = BREPPrimitives.cylinder(200, 500);


    // const cylinder2 = (function () {
    //     let circle1 = new Circle(-1, new Vector(0,0,0), 200).toNurbs( new Plane(AXIS.X, 500));
    //     let circle2 = circle1.translate(new Vector(-1000,0,0));
    //     return enclose([circle1], [circle2])
    //   })();


    const cylinder2 = BREPPrimitives.cylinder(200, 500, Matrix3x4.rotateMatrix(90, AXIS.Y, ORIGIN));

    addShellOnScene(cylinder1);
    addShellOnScene(cylinder2);
    let result = exposure.brep.bool.subtract(cylinder1, cylinder2);

    addShellOnScene(result);
  }

  function test2() {

    function square() {
      let bb = new BrepBuilder();

      const a = bb.vertex(0, 0, 0);
      const b = bb.vertex(300, 0, 0);
      const c = bb.vertex(300, 300, 0);
      const cc = bb.vertex(150, 100, 0);
      const d = bb.vertex(0, 300, 0);
      bb.face().loop([a, b, c, cc, d]);
      return bb.build();
    }
    function square2() {
      let bb = new BrepBuilder();

      const a = bb.vertex(0, 150, -100);
      const b = bb.vertex(350, 150, -100);
      const c = bb.vertex(350, 150, 350);
      const d = bb.vertex(0, 150, 350);
      bb.face().loop([a, b, c, d]);
      return bb.build();
    }
    let s1 = square();
    let s2 = square2();
    // addShellOnScene(s1);
    // addShellOnScene(s2);

    // let result = exposure.brep.bool.intersect(s1, s2);
    let result = s1;
    addShellOnScene(result);
  }

  function test3() {
    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));

    const box3 = exposure.brep.primitives.box(150, 600, 350, new Matrix3x4().translate(25, 25, -250));
    // let result = exposure.brep.bool.union(box1, box2);
    let result = exposure.brep.bool.subtract(box1, box2);
    result = exposure.brep.bool.subtract(result, box3);
    // addShellOnScene(box1);
    addShellOnScene(result);
  }

  function test5() {

    const degree = 3
      , knots = [0, 0, 0, 0, 0.333, 0.666, 1, 1, 1, 1]
      , pts = [ 	[ [0, 0, -10], 	[10, 0, 0], 	[20, 0, 0], 	[30, 0, 0] , 	[40, 0, 0], [50, 0, 0] ],
      [ [0, -10, 0], 	[10, -10, 10], 	[20, -10, 10], 	[30, -10, 0] , [40, -10, 0], [50, -10, 0]	],
      [ [0, -20, 0], 	[10, -20, 10], 	[20, -20, 10], 	[30, -20, 0] , [40, -20, -2], [50, -20, -12] 	],
      [ [0, -30, 0], 	[10, -30, 0], 	[20, -30, -23], 	[30, -30, 0] , [40, -30, 0], [50, -30, 0]     ],
      [ [0, -40, 0], 	[10, -40, 0], 	[20, -40, 0], 	[30, -40, 4] , [40, -40, -20], [50, -40, 0]     ],
      [ [0, -50, 12], [10, -50, 0], 	[20, -50, 20], 	[30, -50, 0] , [50, -50, -10], [50, -50, -15]     ]  ];

    let  srf = verb.geom.NurbsSurface.byKnotsControlPointsWeights( degree, degree, knots, knots, pts );
    srf = srf.transform(new Matrix3x4().scale(10,10,10).toArray());
    srf = new NurbsSurface(srf);
    // __DEBUG__.AddNurbs(srf);

    let bb = new BrepBuilder();
    function vx(u, v) {
      let pt = srf.point(u, v);
      return bb.vertex(pt.x, pt.y, pt.z);
    }

    const a = vx(0.13, 0.13);
    const b = vx(0.9, 0.13);
    const c = vx(0.9, 0.9);
    const d = vx(0.13, 0.9);

    const e = vx(0.33, 0.33);
    const f = vx(0.33, 0.73);
    const g = vx(0.73, 0.73);
    const h = vx(0.73, 0.33);

    function fromVerb(verb) {
      return new BrepCurve(new NurbsCurve(verb));
    }

    let shell = bb.face(srf)
      .loop()
      .edgeTrim(a, b, fromVerb(srf.verb.isocurve(0.13, true)))
      .edgeTrim(b, c, fromVerb(srf.verb.isocurve(0.9, false)))
      .edgeTrim(c, d, fromVerb(srf.verb.isocurve(0.9, true).reverse()))
      .edgeTrim(d, a, fromVerb(srf.verb.isocurve(0.13, false).reverse()))
      .loop()
      .edgeTrim(e, f, fromVerb(srf.verb.isocurve(0.33, false)))
      .edgeTrim(f, g, fromVerb(srf.verb.isocurve(0.73, true)))
      .edgeTrim(g, h, fromVerb(srf.verb.isocurve(0.73, false).reverse()))
      .edgeTrim(h, e, fromVerb(srf.verb.isocurve(0.33, true).reverse()))
      .build();

    addShellOnScene(shell);
  }

  function curvesIntersect() {
    let p1 = [-50,0,0], p2 = [100,0,0], p3 = [100,100,0], p4 = [0,100,0], p5 = [50, 50, 0];
    let pts = [p1, p2, p3, p4, p5];
    let curve1 = new BrepCurve(new NurbsCurve(verb.geom.NurbsCurve.byPoints( pts, 3 )));

    let p1a = [-50,0,0], p2a = [50,-10,0], p3a = [150,50,0], p4a = [30,100,0], p5a = [50, 120, 0];
    let ptsa = [p1a, p2a, p3a, p4a, p5a];
    let curve2 = new BrepCurve(new NurbsCurve(verb.geom.NurbsCurve.byPoints( ptsa, 3 )));

    curve1 = curve1.splitByParam(0.6)[0];
    __DEBUG__.AddCurve(curve1);
    __DEBUG__.AddCurve(curve2);

    let points = curve1.intersectCurve(curve2);
    for (let p of points) {
      __DEBUG__.AddPoint(p.p0);
    }

    // viewer.render();
  }

  
  function surfaceSurfaceIntersect() {
    const degree = 3
      , knots = [0, 0, 0, 0, 0.333, 0.666, 1, 1, 1, 1]
      , pts = [ 	[ [0, 0, -10], 	[10, 0, 0], 	[20, 0, 0], 	[30, 0, 0] , 	[40, 0, 0], [50, 0, 0] ],
      [ [0, -10, 0], 	[10, -10, 10], 	[20, -10, 10], 	[30, -10, 0] , [40, -10, 0], [50, -10, 0]	],
      [ [0, -20, 0], 	[10, -20, 10], 	[20, -20, 10], 	[30, -20, 0] , [40, -20, -2], [50, -20, -12] 	],
      [ [0, -30, 0], 	[10, -30, 0], 	[20, -30, -23], 	[30, -30, 0] , [40, -30, 0], [50, -30, 0]     ],
      [ [0, -40, 0], 	[10, -40, 0], 	[20, -40, 0], 	[30, -40, 4] , [40, -40, -20], [50, -40, 0]     ],
      [ [0, -50, 12], [10, -50, 0], 	[20, -50, 20], 	[30, -50, 0] , [50, -50, -10], [50, -50, -15]     ]  ];

    let  srfA = verb.geom.NurbsSurface.byKnotsControlPointsWeights( degree, degree, knots, knots, pts );
    srfA = srfA.transform(new Matrix3x4().scale(10,10,10).toArray());
    let srfB = srfA
      .transform(new Matrix3x4().translate(250,250,250).toArray())
      .transform(Matrix3x4.rotateMatrix(Math.PI/2, AXIS.X, ORIGIN).toArray());
    srfA = new NurbsSurface(srfA);
    srfB = new NurbsSurface(srfB);

    __DEBUG__.AddParametricSurface(srfA);
    __DEBUG__.AddParametricSurface(srfB);

    
    

  }
  
  function cylinderAndPlaneIntersect() {

    const cylinder = BREPPrimitives.cylinder(200, 500);

    const box = BREPPrimitives.box(700, 600, 100);
    
    addShellOnScene(cylinder);
    addShellOnScene(box);

    let surfaceA = cadRegistry.findFace('0:0').surface;
    let surfaceB = cadRegistry.findFace('1:4').surface;


    let curves = surfaceIntersect(surfaceA.data, surfaceB.data);
    // curve.approxPolyline.

    for (let ic of curves) {
      ic.debug();
      let curve = new BrepCurve(ic);
      let pt = [-50, 220, 0];
      __DEBUG__.AddPoint3(pt, 0x0000ff);
      // let u = findClosestToCurveParamRoughly(curve.impl.approx, pt);
      // let exactU = closestToCurveParam(curve.impl.approx, pt);
      //
      // let clPt = curve.impl.approx.point(u);
      // let exactPt = curve.impl.approx.point(exactU);
      // __DEBUG__.AddPoint3(clPt, 0xffff00);
      // __DEBUG__.AddPoint3(exactPt, 0xff0000);
      // console.dir(curve);
      // __DEBUG__.HideSolids();
    }
    
  }

  function voxelTest(size = 8) {

    const degree = 3
      , knots = [0, 0, 0, 0, 0.333, 0.666, 1, 1, 1, 1]
      , pts = [ 	[ [0, 0, -10], 	[10, 0, 0], 	[20, 0, 0], 	[30, 0, 0] , 	[40, 0, 0], [50, 0, 0] ],
      [ [0, -10, 0], 	[10, -10, 10], 	[20, -10, 10], 	[30, -10, 0] , [40, -10, 0], [50, -10, 0]	],
      [ [0, -20, 0], 	[10, -20, 10], 	[20, -20, 10], 	[30, -20, 0] , [40, -20, -2], [50, -20, -12] 	],
      [ [0, -30, 0], 	[10, -30, 0], 	[20, -30, -23], 	[30, -30, 0] , [40, -30, 0], [50, -30, 0]     ],
      [ [0, -40, 0], 	[10, -40, 0], 	[20, -40, 0], 	[30, -40, 4] , [40, -40, -20], [50, -40, 0]     ],
      [ [0, -50, 12], [10, -50, 0], 	[20, -50, 20], 	[30, -50, 0] , [50, -50, -10], [50, -50, -15]     ]  ];

    let  srf = verb.geom.NurbsSurface.byKnotsControlPointsWeights( degree, degree, knots, knots, pts );
    srf = srf.transform(new Matrix3x4().scale(10,10,10).toArray());
    srf = new NurbsSurface(srf);
    __DEBUG__.AddParametricSurface(srf);

    const origin = [0,-500,-250];
    const treeSize = size;
    const sceneSize = 512;
    const r = sceneSize / treeSize;
    const octree = createOctreeFromSurface(origin, sceneSize, treeSize, srf, 1);
    traverseOctree(octree, treeSize,  (x, y, z, size, tag) => {
      if (size === 1 && tag === 1) {

        // const base = [x, y, z];
        // vec._mul(base, r);
        // vec._add(base, origin);
        // __DEBUG__.AddPolyLine3([
        //   vec.add(base, [0, r, 0]),
        //   vec.add(base, [0, r, r]),
        //   vec.add(base, [0, 0, r]),
        //   base,
        //   vec.add(base, [r, r, 0]),
        //   vec.add(base, [r, r, r]),
        //   vec.add(base, [r, 0, r]),
        //   vec.add(base, [0, 0, 0]),
        // ], 0xff0000);
      }
    });
    console.log("done")
  }

  function testLoadBrep() {

    const box: BrepInputData = {
      vertices: {
        A: [0,0,500],
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
          loops: [['AB', 'BC', 'CD', 'DA']]
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

    };

    const data = ctx.craftEngine.modellingEngine.loadModel(box);

    const mBrepShell = readShellEntityFromJson(data);

    services.exposure.addOnScene(mBrepShell);

  }


  // cylinderAndPlaneIntersect();
  // curvesIntersect();
  // cylTest();
  // surfaceSurfaceIntersect();
  
  
  // let o1 = new DatumObject3D(CSys.origin().move(new Vector(200, 200, 200)), viewer.sceneSetup);
  // o1.setMoveMode(DatumObject3D.AXIS.Y);
  // cadScene.auxGroup.add(o1);
  // let o2 = new DatumObject3D(CSys.origin().move(new Vector(-200, -200, -200)), viewer.sceneSetup);
  // o2.setMoveMode(DatumObject3D.AXIS.Z);
  // cadScene.auxGroup.add(o2);

  // services.action.run('LOFT');
  // window.voxelTest = voxelTest;
  ctx.streams.lifecycle.projectLoaded.attach(ready => {
    if (ready) {
      testLoadBrep()

    }
  });

}



