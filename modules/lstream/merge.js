import {StreamBase} from './base';

export class MergeStream extends StreamBase {

  constructor(streams) {
    super();
    this.streams = streams;
  }

  attach(observer) {
    const detachers = new Array(this.streams.length);
    this.streams.forEach((s, i) => {
      detachers[i] = s.attach(observer);
    });
    return () => detachers.forEach(d => d());
  }
}

