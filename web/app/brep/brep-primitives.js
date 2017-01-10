import * as BREPBuilder from './brep-builder'

export function box(w, h, d) {
  const wh = w * 0.5;
  const hh = h * 0.5;
  const dh = d * 0.5;
  return BREPBuilder.createPrism([
    BREPBuilder.point(-wh, -hh, dh),
    BREPBuilder.point( wh, -hh, dh),
    BREPBuilder.point( wh,  hh, dh),
    BREPBuilder.point(-wh,  hh, dh)
  ], d);
}