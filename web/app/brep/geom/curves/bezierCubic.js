import * as vec from 'math/vec';

export function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return vec.polynomial(
    [mt3     , 3 * mt2 * t, 3 * mt * t2, t3],
    [p0      , p1         , p2         , p3]);
}

export function cubicBezierDer1(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return vec.polynomial(
    [3 * mt2        , 6 * mt * t     , 3 * t2],
    [vec.sub(p1, p0), vec.sub(p2, p1), vec.sub(p3, p2)]);
}

export function cubicBezierDer2(p0, p1, p2, p3, t) {
  return vec.polynomial(
    [
      6 * (1 - t), 
      6 * t
    ],
    [
      vec.polynomial([1, -2, 1], [p2, p1, p0]),
      vec.polynomial([1, -2, 1], [p3, p2, p1])
    ]);
}

