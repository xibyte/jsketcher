
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
