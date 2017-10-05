import {Point} from './geom/point'
import {Plane} from './geom/impl/plane'
import {createPrism, enclose} from './brep-enclose'
import {Matrix3} from '../math/l3space'
import {Circle} from '../3d/craft/sketch/sketch-model'

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
  let circle1 = new Circle(-1, new Point(0,0,h), r).toNurbs(Plane.XY);
  let circle2 = circle1.translate(new Point(0,0,-h));
  return enclose([circle1], [circle2]);
}


const IDENTITY = new Matrix3();