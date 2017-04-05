
export class Curve {

  constructor() {
  }

  intersectCurve(curve) {
    throw 'not implemented';
  }
  
  parametricEquation(t) {
    throw 'not implemented';
  }
  
  translate(vector) {
    throw 'not implemented';
  }
}


export class CompositeCurve {

  constructor() {
    this.curves = [];
    this.points = [];
    this.groups = [];
  }

  add(curve, point, group) {
    this.curves.push(curve);
    this.points.push(point);
    this.groups.push(group);
  }
}
