import pertrub from './vector-petrub';
import {NurbsCurve} from '../geom/impl/nurbs';


export class Ray {
  constructor(pt, dir, reachableDistance) {
    this.pt = pt;
    this.dir = dir;
    this.reachableDistance = reachableDistance;
    this.updateCurve();
  }

  updateCurve() {
    this.curve = NurbsCurve.createLinearNurbs(this.pt, this.pt.plus(this.dir.multiply(this.reachableDistance)));
  }

  pertrub() {
    this.dir.set3(pertrub(this.dir.data()));
    this.updateCurve();
  }
} 