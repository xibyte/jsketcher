import {StreamBase} from './base';

export class ScanStream extends StreamBase {

  constructor(stream, seed, scanFunc) {
    super();
    this.stream = stream;
    this.value = seed;
    this.scanFunc = scanFunc;
  }

  attach(observer) {
    observer(this.value);
    return this.stream.attach(v => {
      this.value = this.scanFunc(this.value, v);
      observer(this.value);
    });
  }
}
