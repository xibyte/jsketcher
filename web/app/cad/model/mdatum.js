import {MObject} from './mobject';

export class MDatum extends MObject {

  static TYPE = 'datum';
  static ID_COUNTER = 0; // TODO: reset the counter
  
  constructor(csys) {
    super(MDatum.TYPE, 'D:' + (MDatum.ID_COUNTER++));
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
}

export class MDatumAxis extends MObject {

  static TYPE = 'datumAxis';

  constructor(id, origin, dir) {
    super(MDatumAxis.TYPE, id);
    this.origin = origin;
    this.dir = dir;
  }
}