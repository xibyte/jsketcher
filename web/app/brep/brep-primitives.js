import {Point} from './geom/point'
import {Plane} from './geom/impl/plane'
import {createPrism, enclose} from './brep-enclose'
import {AXIS, Matrix3} from '../math/l3space'
import {Circle} from '../cad/sketch/sketchModel'

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


export function cylinder(r, h, tr) {
  tr = tr || IDENTITY;
  let circle1 = new Circle(-1, new Point(0,0,0), r).toNurbs( new Plane(tr.apply(AXIS.Z), h));
  let circle2 = circle1.translate(tr.apply(new Point(0,0,-h)));
  return enclose([circle1], [circle2]);
}


const IDENTITY = new Matrix3();