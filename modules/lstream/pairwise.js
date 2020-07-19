import {StreamBase} from './base';
import {NOT_INITIALIZED} from './utils';

export class PairwiseStream extends StreamBase {

  constructor(stream, first) {
    super();
    this.stream = stream;
    this.latest = first === undefined ? NOT_INITIALIZED : first;
  }

  attach(observer) {
    return this.stream.attach(v => {
      if (this.latest !== NOT_INITIALIZED) {
        observer([this.latest, v]);
      }
      this.latest = v;
    });
  }
}
