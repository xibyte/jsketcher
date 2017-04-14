import * as test from '../test'
import {AXIS} from '../../app/math/l3space'

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
      env.assertTrue(result.edge === loop.halfEdges[3]);
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
      env.assertTrue(result.edge === loop.halfEdges[2]);
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
      env.assertTrue(result.edge === loop.halfEdges[2]);
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
      env.assertTrue(result.edge === loop.halfEdges[6]);
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
      env.assertTrue(result.edge === loop.halfEdges[2]);
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
      env.assertTrue(result.vertex === loop.halfEdges[0].vertexA);
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
      env.assertTrue(result.vertex === loop.halfEdges[5].vertexB);
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
      env.assertTrue(result.vertex === loop.halfEdges[3].vertexA);
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
      env.assertTrue(result.vertex === loop.halfEdges[3].vertexB);
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

  /**
   *      o--------o
   *      |         \
   * *--> |          )
   *      |         /
   *      o--------o
   */
  testPIPClassification1NurbsOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,['nurbs', [500,  100], [700,  250], [500,  500] ]]);
      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *      o--------o
   *      |         \
   * *--> |          )
   *      |         /
   *      o--------o
   */
  testPIPClassification1NurbsIn: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,['nurbs', [500,  100], [700,  250], [500,  500] ]]);
      const result = classify(app, win, loop, [300, 300]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },


  /**
   *      *-->
   *      
   *         . ' .
   *       /      \
   *      o        o
   *      |        |
   *      |        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationCloseToNurbsOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,,['nurbs', [500,  500], [250,  750], [100,  500] ]]);
      const result = classify(app, win, loop, [-300, 780]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },
  
  /**
   *      *-->
   *         . ' .
   *       /      \
   *      o        o
   *      |        |
   *      |        | 
   *      |        |
   *      o--------o
   */
  testPIPClassificationTouchesNurbsOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,,['nurbs', [500,  500], [250,  750], [100,  500] ]]);
      const result = classify(app, win, loop, [-300, 750]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *      
   *  *-->   . ' .
   *       /      \
   *      o        o
   *      |        |
   *      |        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationThroughNurbsOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,,['nurbs', [500,  500], [250,  750], [100,  500] ]]);
      const result = classify(app, win, loop, [-300, 650]);
      env.assertFalse(result.inside);
      env.done();
    }));
  },

  /**
   *
   *         . ' .
   *       /  *-> \
   *      o        o
   *      |        |
   *      |        |
   *      |        |
   *      o--------o
   */
  testPIPClassificationCrossesNurbsIn: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,,['nurbs', [500,  500], [250,  750], [100,  500] ]]);
      const result = classify(app, win, loop, [300, 650]);
      env.assertTrue(result.inside);
      env.done();
    }));
  },
  
  /**
   *      o--------o
   *       \        \
   * *-->   )        )
   *       /        /
   *      o--------o
   */
  testPIPClassification2NurbsOut: function (env) {
    test.modeller(env.test((win, app) => {
      const loop = createLoop(app.TPI,[
        [100,  100],
        [500,  100],
        [500,  500],
        [100,  500]
      ], [,['nurbs', [500,  100], [700,  250], [500,  500]], , ['nurbs', [100,  500], [250,  250], [100,  100]]]);
      const result = classify(app, win, loop, [-300, 300]);
      env.assertFalse(result.inside);
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
  loop.halfEdges.forEach(e => win.__DEBUG__.AddHalfEdge(e, 0xffff00));
  const pnt = point(app.TPI, p[0], p[1], 0);
  const beam = pnt.copy();
  beam.x += 1700;
  win.__DEBUG__.AddLine(pnt, beam);
  win.__DEBUG__.AddPoint(pnt, 0xffffff);
  const result = app.TPI.brep.bool.classifyPointInsideLoop(pnt, loop, new app.TPI.brep.geom.Plane(AXIS.Z, 0));
  win.__DEBUG__.AddPoint(pnt, result.inside ? 0x00ff00 : 0xff0000);
  if (result.edge) {
    win.__DEBUG__.AddHalfEdge(result.edge, 0xffffff)
  }
  return result;
}


function createLoop(tpi, points, curves) {
  curves = curves || [];
  const vertices = points.map(p => vertex(tpi, p[0], p[1], 0));
  return tpi.brep.builder.createPlaneLoop(vertices, curves.map(c => {
    if (c && c[0] == 'nurbs') {
      const points = c.slice(1).map(p => new tpi.brep.geom.Point().set3(p) );
      return tpi.brep.geom.NurbsCurve.createByPoints(points, 2);
    }
    return undefined;
  }));
}

function vertex(tpi, x, y, z) {
  return new tpi.brep.topo.Vertex(point(tpi, x, y, z));
}

function point(tpi, x, y, z) {
  return new tpi.brep.geom.Point(x, y, z);
}
