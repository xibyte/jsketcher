import {MObject, MObjectIdGenerator} from './mobject';
import CSys from "../../math/csys";
import Vector from "math/vector";

export class MDatum extends MObject {

  static TYPE = 'datum';
  csys: CSys;
  xAxis: MDatumAxis;
  yAxis: MDatumAxis;
  zAxis: MDatumAxis;

  constructor(csys) {
    super(MDatum.TYPE, MObjectIdGenerator.next(MDatum.TYPE, 'D'));
    this.csys = csys;
    this.xAxis = new MDatumAxis(this.id + '/X', this.csys.origin, this.csys.x);
    this.yAxis = new MDatumAxis(this.id + '/Y', this.csys.origin, this.csys.y);
    this.zAxis = new MDatumAxis(this.id + '/Z', this.csys.origin, this.csys.z);
  }

  getAxisByLiteral(literal) {
    switch (literal) {
      case 'X': return this.xAxis;
      case 'Y': return this.yAxis;
      case 'Z': return this.zAxis;
      default: return null;
    }
  }

  traverse(callback: (obj: MObject) => {}) {
    super.traverse(callback);
    this.xAxis.traverse(callback);
    this.yAxis.traverse(callback);
    this.zAxis.traverse(callback);
  }
}

export class MDatumAxis extends MObject {

  static TYPE = 'datumAxis';
  origin: Vector;
  dir: Vector;

  constructor(id, origin, dir) {
    super(MDatumAxis.TYPE, id);
    this.origin = origin;
    this.dir = dir;
  }
}