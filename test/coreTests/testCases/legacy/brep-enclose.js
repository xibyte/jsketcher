import * as test from '../../test'

export default {


  /**
   * *--> o<-------o
   *      |
   *      |
   *      |/
   *      o
   */
  testEncloseClassificationCoiInNeg: function (env) {
    test.modeller(env.test((win, app) => {
      doTest(env, win, app, [100, 100], [10, 100], [10, 10], [-100, 100], [100, 100], true);
    }));
  },

  /**
   * <--- o<-------o
   *      |
   *      |
   *      |/
   *      o
   */
  testEncloseClassificationCoiInPos: function (env) {
    test.modeller(env.test((win, app) => {
      doTest(env, win, app, [100, 100], [10, 100], [10, 10], [100, 100], [-100, 100], false);
    }));
  },

  /**
   *      ^
   *      |
   *      o<-------o
   *      |
   *      |
   *      |/
   *      o
   */
  testEncloseClassificationCoiOutNeg: function (env) {
    test.modeller(env.test((win, app) => {
      doTest(env, win, app, [100, 100], [10, 100], [10, 10], [10, 0], [10, 200], false);
    }));
  },

  /**
   *      |
   *      \/
   *      o<-------o
   *      |
   *      |
   *      |/
   *      o
   */
  testEncloseClassificationCoiOutPos: function (env) {
    test.modeller(env.test((win, app) => {
      doTest(env, win, app, [100, 100], [10, 100], [10, 10], [10, 200], [10, 0], true);
    }));
  },

  /**  *
   *    \
   *     \
   *      o<-------o
   *      |
   *      |
   *      |/
   *      o
   */
  testEncloseClassificationEntersAngle: function (env) {
    test.modeller(env.test((win, app) => {
      doTest(env, win, app, [100, 100], [10, 100], [10, 10], [0, 110], [1000, -890], true);
    }));
  },

  /**
   *    \
   *     \
   *      o<-------o
   *      |\
   *      | \
   *      |/ *
   *      o
   */
  testEncloseClassificationLeavesAngle: function (env) {
    test.modeller(env.test((win, app) => {
      doTest(env, win, app, [100, 100], [10, 100], [10, 10], [1000, -890], [0, 110], false);
    }));
  },

}

function doTest(env, win, app, encA, encB, encC, curveA, curveB, expected) {
  let [a, b] = createEnclosure(app.TPI, encA, encB, encC);
  let curve = createCurve(app.TPI, curveA, curveB);

  let result = app.TPI.brep.bool.isCurveEntersEnclose(curve, a, b) === 1;

  draw(win, curve, a, b, result);
  env.assertTrue(result === expected);
  env.done();
}

function draw(win, curve, a, b, result) {
  win.__DEBUG__.AddCurve(curve, result ? 0x00ff00 : 0xff0000);
  win.__DEBUG__.AddHalfEdge(a);
  win.__DEBUG__.AddHalfEdge(b);
}

function createEnclosure(tpi, a, b, c) {

  a = new tpi.brep.topo.Vertex(pt(tpi, a));
  b = new tpi.brep.topo.Vertex(pt(tpi, b));
  c = new tpi.brep.topo.Vertex(pt(tpi, c));

  let e1 = createEdge(tpi, a, b);
  let e2 = createEdge(tpi, b, c);

  let loop = new tpi.brep.topo.Loop();
  loop.halfEdges.push(e1, e2);
  loop.link();
  let face = new tpi.brep.topo.Face(new tpi.brep.geom.createBoundingSurface([
    a.point, b.point, c.point
  ]));
  loop.face = face;
  return [e1, e2];
}

function createEdge(tpi, a, b) {
  return new tpi.brep.topo.Edge(tpi.brep.geom.BrepCurve.createLinearCurve(a.point, b.point), a, b).halfEdge1;
}

function createCurve(tpi, a, b) {
  return tpi.brep.geom.BrepCurve.createLinearCurve(pt(tpi,a), pt(tpi,b));
}

const pt = (tpi, arr) => new tpi.brep.geom.Point().set3(arr);
