import {BezierCurve, compute} from '../../web/app/sketcher/shapes/bezier-curve';
import {strict as assert} from 'assert';

const expected = [
  {x: 2, y: 3},
  {x: 5, y: 11},
  {x: 13, y: -7},
  {x: 19, y: 23},
];
const curve = new BezierCurve(2, 3, 5, 11, 13, -7, 19, 23, 'curve-1');
const coords = point => ({x: point.x, y: point.y});
function assertGeometry(c) {
  assert.deepEqual([c.a, c.cp1, c.cp2, c.b].map(coords), expected);
  assert.deepEqual(coords(compute(0, c.a, c.b, c.cp1, c.cp2)), expected[0]);
  assert.deepEqual(coords(compute(1, c.a, c.b, c.cp1, c.cp2)), expected[3]);
  assert.deepEqual(coords(compute(0.5, c.a, c.b, c.cp1, c.cp2)), {x: 9.375, y: 4.75});
  const calls = [];
  c.drawImpl({beginPath() {}, moveTo(...args) { calls.push(args); }, bezierCurveTo(...args) { calls.push(args); }, stroke() {}}, 1, null);
  assert.deepEqual(calls, [[2, 3], [5, 11, 13, -7, 19, 23]]);
}
assertGeometry(curve);
const stored = JSON.parse(JSON.stringify(curve.write()));
const restored = BezierCurve.read('curve-1', stored);
assertGeometry(restored);
const storedAgain = JSON.parse(JSON.stringify(restored.write()));
for (const key of ['cp1', 'cp2', 'cp3', 'cp4']) assert.deepEqual(coords(storedAgain[key]), coords(stored[key]));
console.log('PASS: Bézier control points, rendered geometry and serialized round-trip');
