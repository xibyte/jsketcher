import {MObject, MObjectIdGenerator, MRootObject} from './mobject';
import CSys from "math/csys";
import Vector from "math/vector";
import {Matrix3x4} from "math/matrix";

export class MDatum extends MObject {

  static TYPE = 'datum';
  csys: CSys;
  xAxis: MDatumAxis;
  yAxis: MDatumAxis;
  zAxis: MDatumAxis;

  constructor(csys) {
    super(MDatum.TYPE, MObjectIdGenerator.next(MDatum.TYPE, 'D'));
    this.csys = csys;
    this.xAxis = new MDatumAxis(this.id + '/X', this.csys.origin, this.csys.x, this);
    this.yAxis = new MDatumAxis(this.id + '/Y', this.csys.origin, this.csys.y, this);
    this.zAxis = new MDatumAxis(this.id + '/Z', this.csys.origin, this.csys.z, this);
  }

  getAxisByLiteral(literal) {
    switch (literal) {
      case 'X': return this.xAxis;
      case 'Y': return this.yAxis;
      case 'Z': return this.zAxis;
      default: return null;
    }
  }

  traverse(callback: (obj: MObject) => void) {
    super.traverse(callback);
    this.xAxis.traverse(callback);
    this.yAxis.traverse(callback);
    this.zAxis.traverse(callback);
  }

  get parent() {
    return null;
  }
}

export class MDatumAxis extends MObject {

  static TYPE = 'datumAxis';
  origin: Vector;
  dir: Vector;
  holder: MObject;

  constructor(id, origin, dir, holder) {
    super(MDatumAxis.TYPE, id);
    this.origin = origin;
    this.dir = dir;
    this.holder = holder;
  }

  get parent() {
    return this.holder;
  }
}