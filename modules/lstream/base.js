
export class StreamBase {
  
  attach() {}
  
  next(value) {}
  
  map(fn) {
    return new MapStream(this, fn);
  }

  filter(predicate) {
    return new FilterStream(this, predicate);
  }
}


export class MapStream extends StreamBase {

  constructor(stream, fn) {
    super();
    this.stream = stream;
    this.fn = fn;
  }

  attach(observer) {
    return this.stream.attach(val => observer(this.fn(val)));
  }

  static create = (stream, fn) => new MapStream(stream, fn);
}

export class FilterStream extends StreamBase {

  constructor(stream, predicate) {
    super();
    this.stream = stream;
    this.predicate = predicate;
  }

  attach(observer) {
    return this.stream.attach(val => {
      if (this.predicate(val)) {
        observer(val);
      } 
    });
  }
  
  static create = (stream, predicate) => new FilterStream(stream, predicate);
}
