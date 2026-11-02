import {strict as assert} from 'node:assert';
import {marqueeBounds} from '../../web/app/sketcher/tools/marquee-bounds';
const p = (x, y) => ({x, y});
assert.deepEqual(marqueeBounds({TYPE: 'Point', ...p(2, 3)}), {minX: 2, minY: 3, maxX: 2, maxY: 3});
assert.deepEqual(marqueeBounds({TYPE: 'Segment', a: p(-2, 3), b: p(4, -1)}), {minX: -2, minY: -1, maxX: 4, maxY: 3});
for (const type of ['Circle', 'Arc']) {
  assert.deepEqual(marqueeBounds({TYPE: type, c: p(4, 5), r: {get: () => 3}, a: p(0, 0), b: p(1, 1)}), {minX: 1, minY: 2, maxX: 7, maxY: 8});
}
const rotated = marqueeBounds({TYPE: 'Ellipse', centerX: 0, centerY: 0, radiusX: 4, radiusY: 2, rotation: Math.PI / 2});
assert.ok(Math.abs(rotated.maxX - 2) < 1e-10 && Math.abs(rotated.maxY - 4) < 1e-10);
assert.deepEqual(marqueeBounds({TYPE: 'BezierCurve', a: p(0, 0), cp1: p(-2, 4), cp2: p(5, 2), b: p(3, -1)}), {minX: -2, minY: -1, maxX: 5, maxY: 4});
assert.deepEqual(marqueeBounds({TYPE: 'BSpline', cPoints: [p(-4, 2), p(5, -3), p(1, 4)]}), {minX: -4, minY: -3, maxX: 5, maxY: 4});
assert.equal(marqueeBounds({TYPE: 'Segment', a: p(NaN, 0), b: p(0, 0)}), null);
assert.equal(marqueeBounds({TYPE: 'Unknown'}), null);
console.log('PASS conservative marquee bounds for points, lines and curved shapes');
