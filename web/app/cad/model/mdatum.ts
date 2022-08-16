import {MObject, MObjectIdGenerator} from './mobject';
import CSys from "math/csys";
import Vector, {UnitVector} from "math/vector";
import {EntityKind} from "cad/model/entities";
import Axis from "math/axis";

export class MDatum extends MObject {

  static TYPE = EntityKind.DATUM;
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

  static TYPE = EntityKind.DATUM_AXIS;
  axis: Axis;
  holder: MObject;

  constructor(id, origin, dir, holder) {
    super(MDatumAxis.TYPE, id);
    this.axis = new Axis(origin, dir);
    this.holder = holder;
  }

  get origin(): Vector {
    return this.axis.origin;
  }

  get dir(): UnitVector {
    return this.axis.direction;
  }

  get parent() {
    return this.holder;
  }

  toDirection(): UnitVector {
    return this.dir;
  }

  toAxis(reverse: boolean): Axis {
    let axis = this.axis;
    if (reverse) {
      axis = axis.invert();
    }
    return axis;
  }
}