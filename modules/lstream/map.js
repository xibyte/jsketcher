import {StreamBase} from './base';

export class MapStream extends StreamBase {

  constructor(stream, fn) {
    super();
    this.stream = stream;
    this.fn = fn;
  }

  attach(observer) {
    return this.stream.attach(v => observer(this.fn(v)));
  }
}
