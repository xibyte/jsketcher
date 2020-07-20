import {Point} from 'geom/point'
import {Plane} from 'geom/impl/plane'
import {createPrism, enclose} from './operations/brep-enclose'
import {Circle} from '../../web/app/cad/sketch/sketchModel'
import CSys from 'math/csys';
import {Matrix3x4} from 'math/matrix';
import {AXIS} from "math/vector";

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
  let normal = tr.apply(AXIS.Z);
  let plane = new Plane(normal, h);
  let csys = CSys.fromNormalAndDir(normal.multiply(h), normal, plane.basis()[0]);
  
  let circle1 = new Circle(-1, new Point(0,0,0), r).toNurbs(csys);
  let circle2 = circle1.translate(tr.apply(new Point(0,0,-h)));
  return enclose([circle1], [circle2]);
}


const IDENTITY = new Matrix3x4();