import {MObject} from './mobject';

export class MDatum extends MObject {

  static TYPE = 'datum';
  static ID_COUNTER = 0; // TODO: reset the counter
  
  constructor(csys) {
    super(MDatum.TYPE, 'D:' + (MDatum.ID_COUNTER++));
    this.csys = csys;
  }
}