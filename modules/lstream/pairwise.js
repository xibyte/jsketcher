import {StreamBase} from './base';

export class PairwiseStream extends StreamBase {

  constructor(stream, first) {
    super();
    this.stream = stream;
    this.latest = first;
  }

  attach(observer) {
    return this.stream.attach(v => {
      observer([this.latest, v]);
      this.latest = v;
    });
  }
}
