import {MObject} from './mobject';

export class MDatum extends MObject {

  static TYPE = 'datum';
  static ID_COUNTER = 0;
  
  constructor(csys) {
    super();
    this.id = 'D:' + (MDatum.ID_COUNTER++);
    this.csys = csys;
  }
}