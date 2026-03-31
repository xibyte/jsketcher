import BrepBuilder from 'brep/brep-builder'
import * as BREPPrimitives from 'brep/brep-primitives'
import BrepCurve from 'geom/curves/brepCurve';
import NurbsCurve from "geom/curves/nurbsCurve";
import {surfaceIntersect} from 'geom/intersection/surfaceSurface';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {createOctreeFromSurface, NDTree, traverseOctree} from "voxels/octree";
import {Matrix3x4} from 'math/matrix';
import {AXIS, ORIGIN} from "math/vector";
import {ApplicationContext} from "cad/context";
import {readBrep, writeBrep} from "brep/io/brepIO";
import {pullFace} from "brep/operations/directMod/pullFace";
import {DefeatureFaceWizard} from "./craft/defeature/DefeatureFaceWizard";
import {MBrepShell} from './model/mshell';
import * as vec from "math/vec";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide, Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial
} from "three";
import {pseudoFrenetFrame} from "geom/curves/frenetFrame";
import {renderVoxelSphere} from "voxels/voxelPrimitives";
import {Cube} from "voxels/vixelViz";
import {ndTreeSubtract, ndTreeTransformAndSubtract} from "voxels/voxelBool";


// @ts-ignore
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

    const result = bb.build();
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
    const result = exposure.brep.bool.subtract(cylinder1, cylinder2);

    addShellOnScene(result);
  }

  function test2() {

    function square() {
      const bb = new BrepBuilder();

      const a = bb.vertex(0, 0, 0);
      const b = bb.vertex(300, 0, 0);
      const c = bb.vertex(300, 300, 0);
      const cc = bb.vertex(150, 100, 0);
      const d = bb.vertex(0, 300, 0);
      bb.face().loop([a, b, c, cc, d]);
      return bb.build();
    }
    function square2() {
      const bb = new BrepBuilder();

      const a = bb.vertex(0, 150, -100);
      const b = bb.vertex(350, 150, -100);
      const c = bb.vertex(350, 150, 350);
      const d = bb.vertex(0, 150, 350);
      bb.face().loop([a, b, c, d]);
      return bb.build();
    }
    const s1 = square();
    const s2 = square2();
    // addShellOnScene(s1);
    // addShellOnScene(s2);

    // let result = exposure.brep.bool.intersect(s1, s2);
    const result = s1;
    addShellOnScene(result);
  }

  function test3() {

//
//       	let direction = [0, 0, 500];
//
//       	let sketch = [[
//           {
//             TYPE: PRIMITIVE_TYPES.SEGMENT,
//             a: [0, 0, 0],
//             b: [500, 0, 0],
//           },
//           {
//             TYPE: PRIMITIVE_TYPES.SEGMENT,
//             a: [500, 0, 0],
//             b: [500, 500, 0],
//           },
//           {
//             TYPE: PRIMITIVE_TYPES.SEGMENT,
//             a: [500, 500, 0],
//             b: [0, 500, 0],
//           },
//           {
//             TYPE: PRIMITIVE_TYPES.SEGMENT,
//             a: [0, 500, 0],
//             b: [0, 0, 0],
//           },
//       	]]
//
//
//         let data = ctx.craftEngine.modellingEngine.extrude({
//       		vector: direction,
//       		sketch: sketch,
//       		tolerance: E0_TOLERANCE,
//       		deflection: DEFLECTION
//       	})
//
//       	let box1 = readBrep(data);
//
// //     const box1 = exposure.brep.primitives.box(500, 500, 500);
//     const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));
//
//     const box3 = exposure.brep.primitives.box(150, 600, 350, new Matrix3x4().translate(25, 25, -250));
//     // let result = exposure.brep.bool.union(box1, box2);
//     let result = exposure.brep.bool.subtract(box1, box2);
//     result = exposure.brep.bool.subtract(result, box3);
//     // addShellOnScene(box1);
//     addShellOnScene(result);
  }

  function test4() {
    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750);

    const result = exposure.brep.bool.subtract(box1, box2);
    const mShell = new MBrepShell(result);

    ctx.streams.craft.models.next([mShell]);
  }

  function testSplitFace() {
    throw 'testSplitFace is not yet implemented with native engine';
  }

  function testRemoveFaces() {

    const box1 = exposure.brep.primitives.box(500, 500, 500);
    const box2 = exposure.brep.primitives.box(250, 250, 750, new Matrix3x4().translate(25, 25, 0));

    const withHole = exposure.brep.bool.subtract(box1, box2);
    services.exposure.addOnScene(new MBrepShell(withHole));

    ctx.domService.contributeComponent(DefeatureFaceWizard);

  }

  function testRemoveVertex() {
    throw 'testRemoveVertex is not yet implemented with native engine';
  }

  function testRemoveEdge() {
    throw 'testRemoveEdge is not yet implemented with native engine';
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

    const bb = new BrepBuilder();
    function vx(u, v) {
      const pt = srf.point(u, v);
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

    const shell = bb.face(srf)
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
    const p1 = [-50,0,0], p2 = [100,0,0], p3 = [100,100,0], p4 = [0,100,0], p5 = [50, 50, 0];
    const pts = [p1, p2, p3, p4, p5];
    let curve1 = new BrepCurve(new NurbsCurve(verb.geom.NurbsCurve.byPoints( pts, 3 )));

    const p1a = [-50,0,0], p2a = [50,-10,0], p3a = [150,50,0], p4a = [30,100,0], p5a = [50, 120, 0];
    const ptsa = [p1a, p2a, p3a, p4a, p5a];
    const curve2 = new BrepCurve(new NurbsCurve(verb.geom.NurbsCurve.byPoints( ptsa, 3 )));

    curve1 = curve1.splitByParam(0.6)[0];
    __DEBUG__.AddCurve(curve1);
    __DEBUG__.AddCurve(curve2);

    const points = curve1.intersectCurve(curve2);
    for (const p of points) {
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
  
  // function cylinderAndPlaneIntersect() {
  //
  //   const cylinder = BREPPrimitives.cylinder(200, 500);
  //
  //   const box = BREPPrimitives.box(700, 600, 100);
  //
  //   addShellOnScene(cylinder);
  //   addShellOnScene(box);
  //
  //   let surfaceA = cadRegistry.findFace('0:0').surface;
  //   let surfaceB = cadRegistry.findFace('1:4').surface;
  //
  //
  //   let curves = surfaceIntersect(surfaceA.data, surfaceB.data);
  //   // curve.approxPolyline.
  //
  //   for (let ic of curves) {
  //     ic.debug();
  //     let curve = new BrepCurve(ic);
  //     let pt = [-50, 220, 0];
  //     __DEBUG__.AddPoint3(pt, 0x0000ff);
  //     // let u = findClosestToCurveParamRoughly(curve.impl.approx, pt);
  //     // let exactU = closestToCurveParam(curve.impl.approx, pt);
  //     //
  //     // let clPt = curve.impl.approx.point(u);
  //     // let exactPt = curve.impl.approx.point(exactU);
  //     // __DEBUG__.AddPoint3(clPt, 0xffff00);
  //     // __DEBUG__.AddPoint3(exactPt, 0xff0000);
  //     // console.dir(curve);
  //     // __DEBUG__.HideSolids();
  //   }
  //
  // }

  function voxelTest2(size = 512) {

    size= 128;

    const work = new NDTree(size);
    const tool = new NDTree(size);

    renderVoxelSphere(32, [16,16,16], work);
    renderVoxelSphere(16, [0,0,0], tool);

    // ndTreeSubtract(work, tool);







    let oldNodes = new Set();

    let delta = -5
    function simulate() {

      for (let i = 0; i < 100; i ++) {
        ndTreeTransformAndSubtract(work, tool, (pt) => pt.map(s => s + delta) );
        delta ++;

      }
      work.defragment();


      let curNodes = new Set();

      oldNodes.forEach(n => {
        ctx.cadScene.auxGroup.remove(n.visual);
      });

      oldNodes.clear();

      work.traverse((x, y, z, size, tag, node) => {

        // if (size === 1 ) {
        if (tag !== 'outside') {
          // if (tag === 'edge'  ) {
          //   console.log(size)
          //   console.log(node.xyz)
          //   console.log([x, y, z])


          const cube = new Cube(size, tag);
          cube.position.set(x, y, z);
          ctx.cadScene.auxGroup.add(cube);
          ctx.cadScene.auxGroup.scale.set(10, 10, 10);
          node.visual = cube;

          oldNodes.add(node);
        }

      });
      ctx.viewer.requestRender();
      // setTimeout(() => requestAnimationFrame(simulate), 100);
    }

    simulate()


    console.log("voxel count", ctx.cadScene.auxGroup.children.length);

    // geometry.setAttribute( 'position', new BufferAttribute( new Float32Array(vertices), 3 ) );
    // geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array(normals), 3 ) );



    console.log("done")

  }

  function voxelTest(size = 512) {

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
    // __DEBUG__.AddParametricSurface(srf);

    const origin = [0,-500,-250];
    const treeSize = size;
    const sceneSize = 512;
    const r = sceneSize / treeSize;
    const octree = createOctreeFromSurface(origin, sceneSize, treeSize, srf, 1);

    const geometry = new BufferGeometry();

    const vertices = []
    const normals = []

    traverseOctree(octree, treeSize,  (x, y, z, size, tag, normal) => {
      if (size === 1 && tag === 1) {

        const base = [x, y, z];
        vec._mul(base, r);
        vec._add(base, origin);


        const [T, N, B] = pseudoFrenetFrame(normal);
        let n = vec.add(base, vec.mul(N, r));
        let b = vec.add(base, vec.mul(B, r));
        vertices.push(...base);
        vertices.push(...n);
        vertices.push(...b);

        vertices.push(...b);
        vertices.push(...n);
        vertices.push(...vec._add(vec.add(vec.mul(N, r), vec.mul(B, r)), base));

        normals.push(...normal);
        // __DEBUG__.AddNormal3(base, normal)

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

    geometry.setAttribute( 'position', new BufferAttribute( new Float32Array(vertices), 3 ) );
    // geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array(normals), 3 ) );

    const material = new MeshBasicMaterial( { color: 0xffffff, side: DoubleSide } );
    const mesh = new Mesh( geometry, material );

    ctx.cadScene.auxGroup.add(mesh);

    console.log("done")
  }

  function testPullFace() {
    const box = exposure.brep.primitives.box(500, 500, 500);
    const mShell = new MBrepShell(box);
    services.exposure.addOnScene(mShell);
    pullFace(box.faces[0], 700);
    const mShell2 = new MBrepShell(box);
    services.exposure.addOnScene(mShell2);
  }

  function nonUniformScale() {
    throw 'nonUniformScale is not yet implemented with native engine';
  }

  function testLoadBrep() {
    const box = exposure.brep.primitives.box(500, 500, 500);
    const mShell = new MBrepShell(box);
    services.exposure.addOnScene(mShell);
  }

  // function testTess() {
  //
  //   	let direction = [0, 0, 100];
  //
  //   	let sketch = [[
  //       {
  //         TYPE: PRIMITIVE_TYPES.SEGMENT,
  //         a: [0, 0, 0],
  //         b: [100, 0, 0],
  //       },
  //       {
  //         TYPE: PRIMITIVE_TYPES.SEGMENT,
  //         a: [100, 0, 0],
  //         b: [100, 100, 0],
  //       },
  //       {
  //         TYPE: PRIMITIVE_TYPES.SEGMENT,
  //         a: [100, 100, 0],
  //         b: [0, 100, 0],
  //       },
  //       {
  //         TYPE: PRIMITIVE_TYPES.SEGMENT,
  //         a: [0, 100, 0],
  //         b: [0, 0, 0],
  //       },
  //   	]]
  //
  //   	let data = ctx.craftEngine.modellingEngine.extrude({
  //   		vector: direction,
  //   		sketch: sketch,
  //   		tolerance: E0_TOLERANCE,
  //   		deflection: DEFLECTION
  //   	})
  //
  //   	let brep = readBrep(data);
  //   	let tess = ctx.craftEngine.modellingEngine.tessellate({
  //   		model: data.ptr,
  //   		deflection: DEFLECTION
  //   	})
  //
  //     __DEBUG__.AddFacesTessellation(tess.faces)
  //
  //     console.dir(tess.faces)
  //
  //     // const mBrepShell = readShellEntityFromJson(data);
  //
  //     // services.exposure.addOnScene(mBrepShell);
  //
  //
  //   }

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
  
  /**

   */
  function testOCCT() {
    throw 'testOCCT is not available - OpenCascade has been removed';
  }

  ctx.streams.lifecycle.projectLoaded.attach(ready => {

    if (ready) {
      // testEdgeSplit(ctx);
      //testVertexMoving(ctx);
      //  test4();
      //testSplitFace();
      //testRemoveFaces();
     //testRemoveVertex();
    //  testRemoveEdge();
    // testOJS();
    //   setTimeout(testOCCT, 500);
    //   voxelTest()
      voxelTest2(16)
    }
  });

}

