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
  
  keep() {
    let stateStream = new StateStream(undefined);
    this.attach(v => stateStream.next(v));
    return stateStream;
  }
}

const {MapStream} = require('./map');
const {FilterStream} = require('./filter');
const {StateStream} = require('./state');
const {PairwiseStream} = require('./pairwise');

