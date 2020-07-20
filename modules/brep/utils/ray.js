import pertrub from './vector-petrub';
import BrepCurve from 'geom/curves/brepCurve';


export class Ray {
  constructor(pt, dir, normal, reachableDistance) {
    this.pt = pt;
    this.dir = dir;
    this.normal = normal;
    this.reachableDistance = reachableDistance;
    this.updateCurve();
  }

  updateCurve() {
    this.curve = BrepCurve.createLinearCurve(this.pt, this.pt.plus(this.dir.multiply(this.reachableDistance)));
  }

  pertrub() {
    this.dir.set3(pertrub(this.dir.data()));
    this.updateCurve();
  }
} 