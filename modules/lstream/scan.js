import {StreamBase} from './base';

export class ScanStream extends StreamBase {

  constructor(stream, initAccumulator) {
    super();
    this.stream = stream;
    this.acc = initAccumulator;
  }

  attach(observer) {
    return this.stream.attach(v => this.acc = observer(this.acc, v));
  }
}
