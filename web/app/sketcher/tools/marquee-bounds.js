// Based on the marquee-selection idea in XanthiaJo's upstream jSketcher PR #220.
// Bounds are deliberately conservative for curved objects: the entire circle,
// rotated ellipse or control-point hull is used, not a sampled approximation.
export function marqueeBounds(object) {
  const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const fromPoints = points => {
    if (!points.length || !points.every(point)) return null;
    return points.reduce((b, p) => ({minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y),
      maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y)}),
    {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity});
  };
  if (object.TYPE === 'Point') return fromPoints([object]);
  if (object.TYPE === 'Segment') return fromPoints([object.a, object.b]);
  if (object.TYPE === 'Arc' || object.TYPE === 'Circle') {
    const r = typeof object.r?.get === 'function' ? object.r.get() : object.r;
    if (!point(object.c) || !Number.isFinite(r) || r < 0) return null;
    return {minX: object.c.x - r, minY: object.c.y - r, maxX: object.c.x + r, maxY: object.c.y + r};
  }
  if (object.TYPE === 'Ellipse' || object.TYPE === 'EllipticalArc') {
    const {centerX: x, centerY: y, radiusX: rx, radiusY: ry, rotation: a} = object;
    if (![x, y, rx, ry, a].every(Number.isFinite) || rx < 0 || ry < 0) return null;
    const dx = Math.hypot(rx * Math.cos(a), ry * Math.sin(a));
    const dy = Math.hypot(rx * Math.sin(a), ry * Math.cos(a));
    return {minX: x - dx, minY: y - dy, maxX: x + dx, maxY: y + dy};
  }
  if (object.TYPE === 'BezierCurve') return fromPoints([object.a, object.cp1, object.cp2, object.b]);
  if (object.TYPE === 'BSpline') return fromPoints(object.cPoints || []);
  return null;
}

