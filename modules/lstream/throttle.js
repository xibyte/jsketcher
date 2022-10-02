import {Emitter} from "lstream/emitter";

export class ThrottleStream extends Emitter {

  constructor(stream, delay = 0, accumulator = (v, accum) => v) {
    super();
    this._value = undefined;
    this.scheduled = false;
    this.timeoutID = null;

    stream.attach(val => {
      this._value = accumulator(val, this._value);
      if (!this.scheduled) {
        this.scheduled = true;
        this.timeoutID = setTimeout(this.wakeUp, delay);
      }
    });
  }

  wakeUp = () => {
    this.scheduled = false;
    this.next(this._value);
    this._value = undefined;
  }

  thrust() {
    if (this.scheduled) {
      clearTimeout(this.timeoutID);
      this.wakeUp();
    }
  }
}
