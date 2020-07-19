import * as test from '../../test'

export default {
  
  
  /**
   *      o--------o
   *      |        |
   * *--> |        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationConvexOnlyEdgesOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ]);

      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   *      |   *--> |
   *      |        |
   *      o--------o
   */
  testPIPClassificationConvexOnlyEdgesIn: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ]);

      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   * *--> o        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationConvexPointAndEdgeOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   *      o   *--> |
   *      |        |
   *      o--------o
   */
  testPIPClassificationConvexPointAndEdgeIn: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   * *--> o        o
   *      |        |
   *      o--------o
   */
  testPIPClassificationConvexPointAndPointOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [500,  500],
        [100,  500],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   *      o   *--> o
   *      |        |
   *      o--------o
   */
  testPIPClassificationConvexPointAndPointIn: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [500,  500],
        [100,  500],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },


  /**
   *            o--------o
   *            |        |
   * *--> o-----o        |
   *      |              |
   *      o--------------o
   */
  testPIPClassificationCollinearOut: function (env) {
    test.modeller(env.test((win, app) => {
      
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);
      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },


  /**
   *            o--------o
   *            |        |
   *      o-----o   *--> |
   *      |              |
   *      o--------------o
   */
  testPIPClassificationCollinearIn: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);
      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },
  
  /**
   *            o--------o
   *            |        |
   * *--> o-----o        o-----o
   *      |                    |
   *      o--------------------o
   */
  testPIPClassificationCollinear2Out: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [400,  300],
        [400,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);
      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },


  /**
   *            o--------o
   *            |        |
   *      o-----o   *--> o-----o
   *      |                    |
   *      o--------------------o
   */
  testPIPClassificationCollinear2In: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [400,  300],
        [400,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);
      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  /**
   *  *-->     o 
   *          / \
   *         /   \ 
   *        /     \
   *       /       \ 
   *      o---------o
   */
  testPIPClassificationKissingVertexOut: function (env) {
    test.modeller(env.test((win, app) => {
  
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [300,  300],
      ]);
      const result = classify(app, win, loop, [- 300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *  *-->     o-----o
   *          /       \
   *         /         \
   *        /           \
   *       /             \
   *      o---------------o
   */
  testPIPClassificationKissingVertexAndCollinearOut: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [400,  300],
        [200,  300],
      ]);
      const result = classify(app, win, loop, [- 300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *  *-->     o       o
   *          / \     / \
   *         /   \   /   \
   *        /     \ /     \
   *       /       o       \
   *      o-----------------o
   */
  testPIPClassificationKissing2VerticesOut: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [400,  300],
        [300,  200],
        [200,  300],
      ]);
      const result = classify(app, win, loop, [- 300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },
  
  /**
   *           o       o
   *          / \     / \
   *         /   \   /   \
   *        /     \ /     \
   *       / *-->  o       \
   *      o-----------------o
   */
  testPIPClassificationKissingVertexIn: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [400,  300],
        [300,  200],
        [200,  300],
      ]);
      const result = classify(app, win, loop, [200, 200]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  /**
   *           o       o
   *          / \      |\
   *         /   \     | \
   *        /     \    |  \
   *       / *-->  o---o   \
   *      o-----------------o
   */
  testPIPClassificationKissingVertexCollinearIn: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [400,  300],
        [400,  200],
        [300,  200],
        [200,  300],
      ]);
      const result = classify(app, win, loop, [200, 200]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  /**
   *           o        o
   *          / \       |\
   *         /   \   o  | \
   *        /     \ / \ |  \
   *       / *-->  o   o    \
   *      o-----------------o
   */
  testPIPClassificationKissing2VerticesIn: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [400,  300],
        [400,  200],
        [350,  300],
        [300,  200],
        [200,  300],
      ]);
      const result = classify(app, win, loop, [200, 200]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   *      *        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationOnEdgesPerp: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ]);

      const result = classify(app, win, loop, [100, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.edge[0] === loop[3]);
      env.done();
    }));
  },

  /**
   *          o
   *         /|
   *        * |
   *       /  |
   *      o---o
   */
  testPIPClassificationOnEdgesAngled: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500]
      ]);

      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.edge[0] === loop[2]);
      env.done();
    }));
  },

  /**
   *      o---*----o
   *      |        |
   *      |        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationOnEdgesCollinear: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ]);

      const result = classify(app, win, loop, [300, 500]);
      env.assertTrue(result.inside);
      env.assertTrue(result.edge[0] === loop[2]);
      env.done();
    }));
  },

  /**
   *            o--------o
   *            |        |
   *      o-*---o        o-----o
   *      |                    |
   *      o--------------------o
   */
  testPIPClassificationOnEdgesCollinearT1: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [400,  300],
        [400,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [150, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.edge[0] === loop[6]);
      env.done();
    }));
  },

  /**
   *            o--------o
   *            |        |
   *      o-----o        o---*-o
   *      |                    |
   *      o--------------------o
   */
  testPIPClassificationOnEdgesCollinearT2: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [400,  300],
        [400,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [450, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.edge[0] === loop[2]);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   *      |        |
   *      |        |
   *     (*)-------o
   */
  testPIPClassificationOnVertex: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ]);

      const result = classify(app, win, loop, [100, 100]);
      env.assertTrue(result.inside);
      env.assertTrue(result.vertex === loop[0]);
      env.done();
    }));
  },

  /**
   *            o--------o
   *            |        |
   *      o----(*)       o-----o
   *      |                    |
   *      o--------------------o
   */
  testPIPClassificationOnVertexT1: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [400,  300],
        [400,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [200, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.vertex === loop[6]);
      env.done();
    }));
  },

  /**
   *            o--------o
   *            |        |
   *      o-----o       (*)----o
   *      |                    |
   *      o--------------------o
   */
  testPIPClassificationOnVertexT2: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  300],
        [400,  300],
        [400,  500],
        [200,  500],
        [200,  300],
        [100,  300]
      ]);

      const result = classify(app, win, loop, [400, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.vertex === loop[3]);
      env.done();
    }));
  },

  /**
   *           o        o
   *          / \       |\
   *         /   \   *  | \
   *        /     \ / \ |  \
   *       /       o   o    \
   *      o-----------------o
   */
  testPIPClassificationOnVertexNonConvex: function (env) {
    test.modeller(env.test((win, app) => {

      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [400,  300],
        [400,  200],
        [350,  300],
        [300,  200],
        [200,  300],
      ]);
      const result = classify(app, win, loop, [350, 300]);
      env.assertTrue(result.inside);
      env.assertTrue(result.vertex === loop[4]);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |        |
   *      | *-->   o
   *      |        |
   *      o-o------o
   */
  testPIPClassificationConvexPointAndPointInRound: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [173.69055445978523, -250],
        [173.69055445978523, -40.45650878155794],
        [173.69055445978523, 250],
        [-17.236467236467238, 250],
        [-17.236467236467238, -250],
        [5.818373610536707, -250]
      ]);

      const result = classify(app, win, loop, [5.818373610536707, -40.45650878155793]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },

  testPIPClassification_TR_OUT_TR_INNER: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [322.13852864400235, -37.0295350874076],
        [367.4746645834503, -15.906441503172019],
        [251.791373147527, 232.3826363038744],
        [245.2760702222779, 246.36631998769906],
        [220.04289927805857, 300.5238449519503],
        [174.70676333861064, 279.4007513677147],
        [190.09822472107308, 246.36631998769903],
        [251.82559013214498, 113.88192709797234],
      ]);

      const result = classify(app, win, loop, [201.75255470018428, 221.3528300786975]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },
}

function classify(app, win, loop, p) {

  const n = loop.length;
  for (let p = n - 1, q = 0; q < n; p = q ++) {
    const a = loop[p];
    const b = loop[q];
    win.__DEBUG__.AddSegment(a, b, 0xffff00);
  }

  const pnt = new app.TPI.brep.geom.Point(p[0], p[1], 0);
  const beam = pnt.copy();
  beam.x += 1700;
  win.__DEBUG__.AddLine(pnt, beam);
  win.__DEBUG__.AddPoint(pnt, 0xffffff);
  const result = app.TPI.brep.pip(loop)(pnt);
  win.__DEBUG__.AddPoint(pnt, result.inside ? 0x00ff00 : 0xff0000);
  if (result.edge) {
    win.__DEBUG__.AddSegment(result.edge[0], result.edge[1], 0xffffff)
  }
  return result;
}


function createLoop(tpi, points) {
  return points.map(([x, y]) => new tpi.brep.geom.Point(x, y, 0));
}
