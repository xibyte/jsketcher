// Browser regression for https://github.com/xibyte/jsketcher/pull/217.
import {BSpline, BSplineType, ParameterMethod} from '../../web/app/sketcher/shapes/b-spline';
import {EndPoint} from '../../web/app/sketcher/shapes/point';

function assertNear(actual: number, expected: number) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-8) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
}
function point(x: number, y: number) { return new EndPoint(x, y); }
export function checkSplineEndpoints() {
  const clamped = new BSpline({degree: 3, cPoints: [point(10, 20), point(20, 20), point(20, 30), point(10, 30)],
    fPoints: [], kValues: [0, 0, 0, 0, 1, 1, 1, 1], interpolation: false, CVModel: false,
    type: BSplineType.Clamped, method: ParameterMethod.QuasiUniform});
  assertNear(clamped.getPoint(1).x, 10);
  assertNear(clamped.getPoint(1).y, 30);
  assertNear(clamped.method, ParameterMethod.QuasiUniform);
  const reopened = BSpline.read('saved', JSON.parse(JSON.stringify(clamped.write())));
  assertNear(reopened.method, ParameterMethod.QuasiUniform);
  assertNear(reopened.getPoint(1).y, 30);
  const open = new BSpline({degree: 2, cPoints: [point(0, 0), point(2, 2), point(4, 4), point(6, 6)],
    fPoints: [], kValues: [0, 1, 2, 3, 4, 5, 6], interpolation: false, CVModel: false,
    type: BSplineType.Open, method: ParameterMethod.Centripetal});
  assertNear(open.getPoint(4).x, 5);
  assertNear(open.getPoint(4).y, 5);
  return 'PASS clamped/open endpoints and saved parameter method';
}
