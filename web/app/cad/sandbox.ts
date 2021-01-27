import BrepBuilder from 'brep/brep-builder'
import * as BREPPrimitives from 'brep/brep-primitives'
import BrepCurve from 'geom/curves/brepCurve';
import NurbsCurve from "geom/curves/nurbsCurve";
import {surfaceIntersect} from 'geom/intersection/surfaceSurface';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {createOctreeFromSurface, traverseOctree} from "voxels/octree";
import {Matrix3x4} from 'math/matrix';
import {AXIS, ORIGIN} from "math/vector";
import {BrepInputData, CubeExample} from "engine/data/brepInputData";
import {ApplicationContext} from "context";
import {readShellEntityFromJson} from "./scene/wrappers/entityIO";
import {DEFLECTION, E0_TOLERANCE} from "./craft/e0/common";
import {readBrep, writeBrep} from "brep/io/brepIO";
import {PRIMITIVE_TYPES} from "engine/data/primitiveData";
import {pullFace} from "brep/operations/directMod/pullFace";
import {DefeatureFaceWizard} from "./craft/defeature/DefeatureFaceWizard";
import {defeatureByVertex, defeatureByEdge} from "brep/operations/directMod/defeaturing";
import {BooleanType} from "engine/api";
import { testEdgeSplit } from 'brep/operations/directMod/edgeSplit';

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
  
  
      	let direction = [0, 0, 500];
  
      	let sketch = [[
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [0, 0, 0],
            b: [500, 0, 0],
          },
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [500, 0, 0],
            b: [500, 500, 0],
          },
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [500, 500, 0],
            b: [0, 500, 0],
          },
          {
            TYPE: PRIMITIVE_TYPES.SEGMENT,
            a: [0, 500, 0],
            b: [0, 0, 0],
          },
      	]]
  
      	let data = ctx.craftEngine.modellingEngine.extrude({
      		vector: direction,
      		sketch: sketch,
      		tolerance: E0_TOLERANCE,
      		deflection: DEFLECTION
      	})
  
      	let box1 = readBrep(data);
  
//     const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));

//     const box3 = exposure.brep.primitives.box(150, 600, 350, new Matrix3x4().translate(25, 25, -250));
    // let result = exposure.brep.bool.union(box1, box2);
    let result = exposure.brep.bool.subtract(box1, box2);
    result = exposure.brep.bool.subtract(result, box3);
    // addShellOnScene(box1);
    addShellOnScene(result);
  }

  function test4() {
    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750);

    console.dir(writeBrep(box1));
    let l1 = ctx.craftEngine.modellingEngine.loadModel(writeBrep(box1));
    let l2 = ctx.craftEngine.modellingEngine.loadModel(writeBrep(box2));

    // let l11 = ctx.craftEngine.modellingEngine.getModelData({model: l1.ptr});


    console.dir(l1);
    console.dir(l2);
    // console.dir(l11);
    //
    // console.dir(writeBrep(box1));
    // console.dir(writeBrep(readShellEntityFromJson(l1).brepShell));

    const result = ctx.craftEngine.modellingEngine.boolean({
      deflection: DEFLECTION,
      operandsA: [l1.ptr],
      operandsB: [l2.ptr],
      tolerance: E0_TOLERANCE,
      type: BooleanType.SUBTRACT
    });

    ctx.streams.craft.models.next([
      // readShellEntityFromJson(l1),
      // readShellEntityFromJson(l2),
      readShellEntityFromJson(result.result)
    ]);
  }

  function testSplitFace() {
    const box1 = exposure.brep.primitives.box(500, 500, 500);

    const serialized = writeBrep(box1);
    const loaded = ctx.craftEngine.modellingEngine.loadModel(serialized);
    const face = loaded.faces[0];
    const [e1, e2]  = face.loops[0];

    const splitted = ctx.craftEngine.modellingEngine.splitFace({
      deflection: DEFLECTION,
      shape: loaded.ptr,
      face: face.ptr,
      edge: {
        curve: {
          TYPE: 'LINE',
          a: [-250, -250, -250],
          b: [ 250, -250,  250]
        }
      }
    })

    services.exposure.addOnScene(readShellEntityFromJson(splitted));

//     addShellOnScene(result);
  }

  function testRemoveFaces() {

    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));

    let withHole = ctx.craftEngine.modellingEngine.loadModel(writeBrep(exposure.brep.bool.subtract(box1, box2)));
    services.exposure.addOnScene(readShellEntityFromJson(withHole));




    ctx.domService.contributeComponent(DefeatureFaceWizard);

  }

  function testRemoveVertex() {

    const boxData = ctx.craftEngine.modellingEngine.loadModel(writeBrep(exposure.brep.primitives.box(500, 500, 500)));
    const box = readShellEntityFromJson(boxData);
    services.exposure.addOnScene(box);
    box.vertices.forEach(v => v.ext.view.rootGroup.sphere.onMouseClick = () => {
      ctx.craftService.models$.update((models) => {
        const [cube] = models;
        const result = defeatureByVertex(cube.brepShell, v.brepVertex, ctx.craftEngine.modellingEngine);
        const mShell = readShellEntityFromJson(result);
        return [mShell];
      });
    });
  }

  function testRemoveEdge() {

    const boxData = ctx.craftEngine.modellingEngine.loadModel(writeBrep(exposure.brep.primitives.box(500, 500, 500)));
    const box = readShellEntityFromJson(boxData);
    services.exposure.addOnScene(box);
    box.edges.forEach(e => e.ext.view.picker.onMouseClick = () => {
      ctx.craftService.models$.update((models) => {
        const [cube] = models;
        const result = defeatureByEdge(cube.brepShell, e.brepEdge, ctx.craftEngine.modellingEngine);
        const mShell = readShellEntityFromJson(result);
        return [mShell];
      });
    });
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

  function testPullFace() {

    const box: BrepInputData = CubeExample();
    //
    let data = ctx.craftEngine.modellingEngine.loadModel(box);


    const shell = readShellEntityFromJson(data);
    services.exposure.addOnScene(shell);

    pullFace(shell.brepShell.faces[0], 700);

    const ser = writeBrep(shell.brepShell);
    ser.curves = {};
    console.log(ser);
    let fromSerialization = ctx.craftEngine.modellingEngine.loadModel(ser);

    const mBrepShell2 = readShellEntityFromJson(fromSerialization);
    services.exposure.addOnScene(mBrepShell2);

  }

  function nonUniformScale() {

    const box: BrepInputData = CubeExample();

    let data = ctx.craftEngine.modellingEngine.loadModel(box);
    // data = ctx.craftEngine.modellingEngine.transform({
    //   model: data.ptr,
    //   matrix: new Matrix3x4().scale(1,2,1).toFlatArray()
    // });

    const mShell = readShellEntityFromJson(data);
    // const shell = mShell.brepShell as Shell;
    // // shell.transform(new Matrix3x4().scale(1,2,1));

    // const scaledInput = writeBrep(shell);
    // console.dir(scaledInput);
    // let data2 = ctx.craftEngine.modellingEngine.loadModel(scaledInput);

    // const mShell2 = readShellEntityFromJson(data2);
    services.exposure.addOnScene(mShell);
  }

  function testLoadBrep() {

    const box: BrepInputData = CubeExample();
    //
    let data = ctx.craftEngine.modellingEngine.loadModel(box);
    //
    // ctx.craftEngine.modellingEngine.setLocation({
    //   model: data.ptr,
    //   matrix: Matrix3x4.rotateMatrix(45 * DEG_RAD, AXIS.Y, ORIGIN).toFlatArray()
    // });
    //
    // data = ctx.craftEngine.modellingEngine.getModelData({
    //   model: data.ptr,
    // });
    //
    // const tessellation = ctx.craftEngine.modellingEngine.tessellate({
    //   model: data.ptr,
    //   deflection: 3
    // });
    //
    // const location = ctx.craftEngine.modellingEngine.getLocation({
    //   model: data.ptr
    // });
    //
    // console.log("Location: ->>> ");
    // console.log(location);
    //
    // console.log("Tesselation: ->>> ");
    // console.log(tessellation);
    //
    // // ctx.craftEngine.modellingEngine.dispose({
    // //   model: data.ptr
    // // });
    // //
    // // ctx.craftEngine.modellingEngine.getLocation({
    // //   model: data.ptr
    // // });

    console.log("DATA:");
    console.log(data);


    const mBrepShell = readShellEntityFromJson(data);
    // services.exposure.addOnScene(mBrepShell);

    // return ;
// debugger
    const serialized = writeBrep(mBrepShell.brepShell);
    console.log("SERAIL:");
    console.log(serialized);
    let fromSerialization = ctx.craftEngine.modellingEngine.loadModel(serialized);

    console.log("FROM:");
    console.log(fromSerialization);

    const mBrepShell2 = readShellEntityFromJson(fromSerialization);

    services.exposure.addOnScene(mBrepShell2);

  }

  function testTess() {

    	let direction = [0, 0, 100];

    	let sketch = [[
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [0, 0, 0],
          b: [100, 0, 0],
        },
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [100, 0, 0],
          b: [100, 100, 0],
        },
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [100, 100, 0],
          b: [0, 100, 0],
        },
        {
          TYPE: PRIMITIVE_TYPES.SEGMENT,
          a: [0, 100, 0],
          b: [0, 0, 0],
        },
    	]]

    	let data = ctx.craftEngine.modellingEngine.extrude({
    		vector: direction,
    		sketch: sketch,
    		tolerance: E0_TOLERANCE,
    		deflection: DEFLECTION
    	})

    	let brep = readBrep(data);
    	let tess = ctx.craftEngine.modellingEngine.tessellate({
    		model: data.ptr,
    		deflection: DEFLECTION
    	})

      __DEBUG__.AddFacesTessellation(tess.faces)

      console.dir(tess.faces)

      // const mBrepShell = readShellEntityFromJson(data);

      // services.exposure.addOnScene(mBrepShell);


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
      // testEdgeSplit(ctx);
      //testVertexMoving(ctx);
       test4();
      //testSplitFace();
      //testRemoveFaces();
     //testRemoveVertex();
     testRemoveEdge();
    }
  });

}



