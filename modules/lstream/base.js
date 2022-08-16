export class StreamBase {

  attach(observer) {}

  map(fn) {
    return new MapStream(this, fn);
  }

  filter(predicate) {
    return new FilterStream(this, predicate);
  }

  pairwise(first) {
    return new PairwiseStream(this, first);
  }

  scan(initAccumulator, scanFunc) {
    return new ScanStream(this, initAccumulator, scanFunc);
  }
  
  remember(initialValue, usingStream) {
    if (!usingStream) {
      usingStream = StateStream;
    }
    const stateStream = new usingStream(initialValue);
    this.attach(v => stateStream.next(v));
    return stateStream;
  }
  
  distinct() {
    return new DistinctStream(this);
  }
  
  throttle(delay, accumulator) {
    return new ThrottleStream(this, delay, accumulator);
  }

  pipe(otherStream) {
    return this.attach(v => otherStream.next(v));
  }
}

const {MapStream} = require('./map');
const {FilterStream} = require('./filter');
const {StateStream} = require('./state');
const {PairwiseStream} = require('./pairwise');
const {ScanStream} = require('./scan');
const {DistinctStream} = require('./distinct');
const {ThrottleStream} = require('./throttle');
