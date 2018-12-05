import {StreamBase} from './base';

export class DistinctStream extends StreamBase {

  constructor(stream) {
    super();
    this.stream = stream;
    this.latest = undefined;
  }

  attach(observer) {
    return this.stream.attach(v => {
      if (this.latest !== v) {
        observer(v);
        this.latest = v;
      }
    });
  }
}
