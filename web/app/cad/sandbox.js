import {AXIS, Matrix3, ORIGIN} from '../math/l3space'

import BrepBuilder from '../brep/brep-builder'
import * as BREPPrimitives from '../brep/brep-primitives'
import {BREPSceneSolid} from './scene/wrappers/brepSceneObject'
import {NurbsCurve, NurbsCurveImpl, NurbsSurface} from "../brep/geom/impl/nurbs";


function runSandbox({bus, services: {viewer, cadScene, TPI}}) {


  function addShellOnScene(shell, skin) {
    const sceneSolid = new BREPSceneSolid(shell, undefined, skin);
    cadScene.add(sceneSolid.cadGroup);
    viewer.render();
    return sceneSolid;
  }

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


    const cylinder2 = BREPPrimitives.cylinder(200, 500, Matrix3.rotateMatrix(90, AXIS.Y, ORIGIN));

    let result = TPI.brep.bool.subtract(cylinder1, cylinder2);

    // addShellOnScene(cylinder1);
    // addShellOnScene(cylinder2);
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

    // let result = TPI.brep.bool.intersect(s1, s2);
    let result = s1;
    addShellOnScene(result);
  }

  function test3() {
    const box1 = TPI.brep.primitives.box(500, 500, 500);
    const box2 = TPI.brep.primitives.box(250, 250, 750, new Matrix3().translate(25, 25, 0));

    const box3 = TPI.brep.primitives.box(150, 600, 350, new Matrix3().translate(25, 25, -250));
    // let result = TPI.brep.bool.union(box1, box2);
    let result = TPI.brep.bool.subtract(box1, box2);
    result = TPI.brep.bool.subtract(result, box3);
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
    srf = srf.transform(new Matrix3().scale(10,10,10).toArray());
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
      return new NurbsCurve(new NurbsCurveImpl(verb));
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

  
  // const app = this;
  // test3();
  cylTest();

  return;

  // let curve1 = new NurbsCurve(new verb.geom.NurbsCurve({"degree":6,"controlPoints":[[150,149.99999999999997,-249.99999999999994,1],[108.33333333333051,150.00000000000907,-250.00000000001975,1],[66.6666666666712,149.99999999998562,-249.99999999996987,1],[24.99999999999545,150.00000000001364,-250.00000000002711,1],[-16.66666666666362,149.99999999999145,-249.9999999999837,1],[-58.33333333333436,150.0000000000029,-250.00000000000531,1],[-99.99999999999997,150,-250,1]],"knots":[0,0,0,0,0,0,0,1,1,1,1,1,1,1]}));
  // let curve2 = new NurbsCurve(new verb.geom.NurbsCurve({"degree":9,"controlPoints":[[100,-250,-250,1],[99.9999999999927,-194.44444444444687,-250.00000000000028,1],[100.00000000002228,-138.8888888888811,-249.99999999999838,1],[99.99999999995923,-83.33333333334777,-250.00000000000287,1],[100.00000000005268,-27.77777777775936,-249.99999999999744,1],[99.9999999999493,27.777777777760704,-250.0000000000008,1],[100.00000000003591,83.33333333334477,-250.00000000000063,1],[99.99999999998269,138.88888888888374,-249.99999999999966,1],[100.00000000000443,194.44444444444562,-249.99999999999986,1],[100,250,-250,1]],"knots":[0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1]}));

  let p1 = [-50,0,0], p2 = [100,0,0], p3 = [100,100,0], p4 = [0,100,0], p5 = [50, 50, 0];
  let pts = [p1, p2, p3, p4, p5];
  let curve1 = new NurbsCurve(new NurbsCurveImpl(verb.geom.NurbsCurve.byPoints( pts, 3 )));

  let p1a = [-50,0,0], p2a = [50,-10,0], p3a = [150,50,0], p4a = [30,100,0], p5a = [50, 120, 0];
  let ptsa = [p1a, p2a, p3a, p4a, p5a];
  let curve2 = new NurbsCurve(new NurbsCurveImpl(verb.geom.NurbsCurve.byPoints( ptsa, 3 )));

  curve1 = curve1.splitByParam(0.6)[0];
  __DEBUG__.AddCurve(curve1);
  __DEBUG__.AddCurve(curve2);

  let points = curve1.intersectCurve(curve2);
  for (let p of points) {
    __DEBUG__.AddPoint(p.p0);
  }

  // viewer.render();

}



