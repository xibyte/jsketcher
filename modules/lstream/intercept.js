export function intercept(stream, interceptor) {

  stream._realNext = stream.next;

  stream.next = function(value) {

    const next = (value) => {
      this._realNext(value);
    };

    interceptor(value, stream, next);
  };
  return stream;
}