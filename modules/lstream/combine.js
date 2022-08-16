import {StreamBase} from './base';
import {NOT_INITIALIZED} from './utils';

export class CombineStream extends StreamBase {

  constructor(streams) {
    super();
    streams.forEach(stream => {
      if (!stream) {
        throw 'stream is undefined';
      }
    });
    this.streams = streams;
    this.values = this.streams.map(() => NOT_INITIALIZED);
    this.ready = false;
  }

  attach(observer) {
    const detachers = new Array(this.streams.length);
    this.streams.forEach((s, i) => {
      detachers[i] = s.attach(value => {
        this.values[i] = value;
        if (!this.ready) {
          this.ready = this.isReady();
        }
        if (this.ready) {
          observer(this.values);
        }
      });
    });
    return () => detachers.forEach(d => d());
  }

  isReady() {
    for (const val of this.values) {
      if (val === NOT_INITIALIZED) {
        return false;
      }
    }
    return true;
  }
}
