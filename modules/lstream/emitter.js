import {StreamBase} from './base';

const READY = 0;
const EMITTING = 1;

export class Emitter extends StreamBase {

  constructor() {
    super();
    this.observers = [];
    this.state = READY;
  }

  attach(observer) {
    this.observers.push(observer);
    return () => this.detach(observer);
  }

  detach(callback) {
    for (let i = this.observers.length - 1; i >= 0 ; i--) {
      if (this.observers[i] === callback) {
        this.observers.splice(i, 1);
      }
    }
  };

  next(value) {
    if (this.state === EMITTING) {
      console.warn('recursive dispatch');
      return;
    }
    try {
      this.state = EMITTING;
      for (let i = 0; i < this.observers.length; i++) {
        this.observers[i](value);
      }
    } finally {
      this.state = READY;
    }
  }
}
