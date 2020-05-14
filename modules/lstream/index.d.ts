interface StreamBase<T> {

  attach(callback: (value: T) => any): () => void

  map<T, V>(fn: (value: T) => V);

  filter<T>(stream: Stream<T>, predicate: (T) => boolean): Stream<T>;

  pairwise(first: T): Stream<[T, T]>;

  scan(initAccumulator: any): Stream<any>;

  remember(initialValue: T, usingStream: any): Stream<T>

  distinct(): Stream<T>;

  throttle(delay?: number, accumulator?: any): Stream<T>;

  pipe(otherStream): () => void;
}

interface Stream<T> extends StreamBase<T> {


}

interface StateStream<T> extends Stream<T> {

  value: T;

  next(value?: T) : void;

}


export function stream<T>(): Stream<T>;

export function eventStream<T>(): Stream<T>;

export function combine(...streams: Stream<any>[]): Stream<any[]>;

export function merge(...streams: Stream<any>[]): Stream<any>;

export function state<T>(initialValue: T): StateStream<T>;

export function distinctState<T>(initialValue: T): StateStream<T>;

export function externalState<T>(get: any, set: any): StateStream<T>;

export function never<T>(): Stream<T>

export function constant<T>(value: T): Stream<T>

export function map<T, V>(stream: Stream<T>, fn: (T) => V): Stream<V>;

export function filter<T>(stream: Stream<T>, predicate: (T) => boolean): Stream<T>;

