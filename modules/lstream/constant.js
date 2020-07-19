import {Emitter} from './emitter';
import {NOOP} from '../gems/func';

export class ConstantStream extends Emitter {

  constructor(value) {
    super();
    this._value = value;
  }
  
  get value() {
    return this._value;
  }

  attach(observer) {
    observer(this._value);
    return NOOP;
  }
}

