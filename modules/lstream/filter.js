import {StreamBase} from './base';

export class FilterStream extends StreamBase {

  constructor(stream, predicate) {
    super();
    this.stream = stream;
    this.predicate = predicate;
  }

  attach(observer) {
    return this.stream.attach(val => {
      if (this.predicate(val)) {
        observer(val);
      }
    });
  }
}
