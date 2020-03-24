import * as test from '../../test'

const TESTS = {};
let counter = 0;

addTest(sample1, [300, 300], true);
addTest(sample1, [300, 200], true);
addTest(sample1, [300, 400], false);
addTest(sample1, [500, 500], true);
addTest(sample1, [650, 300], false);
addTest(sample1, [460, 280], true);
addTest(sample1, [  0, 100], false);
addTest(sample1, [1000, 100], false);
addTest(sample1, [550, 200], true);
addTest(sample1, [730, 200], true);
addTest(sample1, [100,   0], false);
addTest(sample1, [300,   0], false);
addTest(sample1, [800,   0], false);
addTest(sample1, [850,  50], false);
addTest(sample1, [770, 130], true);
addTest(sample1, [800, 700], false);
addTest(sample1, [350, 500], false);
addTest(sample1, [300, 400], false);
addTest(sample1, [100, 400], false);

addTest(sample2, [600, 100], false);
addTest(sample2, [525, 199], false);
addTest(sample2, [200, 140], true);


function addTest(sample, pt, expected) {
  let testName = 'test' + (++counter);
  TESTS[testName] = function (env) {
    test.modeller(env.test((win, app) => {
      let face = sample(app);
      const result = rayCast(app, win, face, pt);
      env.assertTrue(expected === result.inside);
      env.done();
    }));
  }
}


function rayCast(app, win, face, pt) {
  pt = new app.TPI.brep.geom.Point().set3(pt);
  let result = face.rayCast(pt);
  win.__DEBUG__.AddFace(face);
  win.__DEBUG__.AddPoint(pt, result.inside ? 0x00ff00 : 0xff0000);
  return result;
}

function sample1(app) {
  return createFace(app.TPI,[
    [500,  300],
    [300,  300],
    [100,  300],
    [100,  100],
    [300,  100],
    [500,  100],
    [800,  100],
    [800,  600],
    [500,  600],
    [400,  500],
    [500,  400],
  ], [[
    [600, 500],
    [700, 500],
    [700, 200],
    [600, 200],
  ]]);
  
}

function sample2(app) {
  return createFace(app.TPI,[
    [500,  100],
    [100,  200],
    [100,  100]
  ], []);
}

function createFace(tpi, _outer, _holes) {

  const bb = new tpi.brep.builder();
  const vx = p => bb.vertex(p[0], p[1], 0);
  
  let outer = _outer.map(vx);
  let holes = _holes.map(h => h.map(vx));

  let face1 = bb.face();
  face1.loop(outer);
  for (let hole of holes) {
    face1.loop(hole);
  }

  let face2 = bb.face();
  outer.reverse();
  face2.loop(outer);
  for (let hole of holes) {
    hole.reverse();
    face2.loop(hole);
  }
  return bb.build().faces[0];
}

export default TESTS;
