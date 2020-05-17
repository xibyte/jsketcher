import {StreamBase} from './base';

export class ThrottleStream extends StreamBase {

  constructor(stream, delay = 0, accumulator = v => v) {
    super();
    this.stream = stream;
    this.delay = delay;
    this.accumulator = accumulator;
  }

  attach(observer) {
    let scheduled = false;
    let value = undefined;
    return this.stream.attach(val => {
      value = this.accumulator(val);
      if (!scheduled) {
        setTimeout(() => {
          scheduled = false;
          observer(value);
        });
      }
    }, this.delay)
  }
}
