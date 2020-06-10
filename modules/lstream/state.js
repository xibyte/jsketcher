import {callObserver, Emitter} from './emitter';

export class StateStream extends Emitter {

  constructor(initialValue) {
    super();
    this._value = initialValue;
  }
  
  get value() {
    return this._value;
  }

  set value(v) {
    this.next(v);
  }

  next(v) {
    this._value = v;
    super.next(v);
  }

  update(updater) {
    this.value = updater(this._value);
  }

  mutate(mutator) {
    mutator(this._value);
    this.next(this._value);
  }

  attach(observer) {
    callObserver(observer, this._value);
    return super.attach(observer);
  }
}

export class DistinctStateStream extends StateStream {

  next(v) {
    if (this._value === v) {
      return;
    }
    super.next(v);
  }
}
