import {Point} from './geom/point'
import {createPrism} from './brep-builder'
import {Matrix3} from '../math/l3space'

export function box(w, h, d, tr) {
  const wh = w * 0.5;
  const hh = h * 0.5;
  const dh = d * 0.5;
  if (!tr) {
    tr = IDENTITY;
  }
  return createPrism([
    tr._apply(new Point(-wh, -hh, dh)),
    tr._apply(new Point( wh, -hh, dh)),
    tr._apply(new Point( wh,  hh, dh)),
    tr._apply(new Point(-wh,  hh, dh))
  ], d);
}

const IDENTITY = new Matrix3();