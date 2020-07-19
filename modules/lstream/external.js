import {Emitter} from './emitter';

export class ExternalStateStream extends Emitter {

  constructor(get, set) {
    super();
    this.get = get;
    this.set = set;
  }
  
  get value() {
    return this.get();
  }

  set value(v) {
    this.next(v);
  }

  next(v) {
    this.set(v);
    super.next(v);
  }

  update(updater) {
    this.value = updater(this.value);
  }

  mutate(mutator) {
    mutator(this.value);
    this.next(this.value);
  }

  attach(observer) {
    observer(this.value);
    return super.attach(observer);
  }
}


