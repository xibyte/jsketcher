import {ThrottleStream} from "lstream/throttle";

interface Observable<T> {
  attach(callback: (value: T) => any): () => void
}

interface Stream<T> extends Observable<T> {

  map<V>(fn: (value: T) => V);

  filter(predicate: (T) => boolean): Stream<T>;

  pairwise(first?: T): Stream<[T, T]>;

  scan<R>(seed: R, scanFn: (accum: R, current: T) => R): Stream<R>;

  remember(initialValue: T, usingStream?: any): StateStream<T>

  distinct(): Stream<T>;

  throttle(delay?: number, accumulator?: any): ThrottleStream<T>;

  pipe(otherStream): () => void;
}

interface Emitter<T> extends Stream<T> {

  next(value?: T) : void;

}

interface StateStream<T> extends Emitter<T> {

  value: T;

  update(updater: (T) => T): void;

  mutate(mutator: (T) => void): void;
}


export function stream<T>(): Emitter<T>;

export function eventStream<T>(): Emitter<T>;

export function combine<T>(...streams: Stream<any>[]): Stream<T>;

export function merge(...streams: Stream<any>[]): Stream<any>;

export function state<T>(initialValue: T): StateStream<T>;

export function distinctState<T>(initialValue: T): StateStream<T>;

export function externalState<T>(get: any, set: any): StateStream<T>;

export function never<T>(): Emitter<T>

export function constant<T>(value: T): Stream<T>

export function map<T, V>(stream: Stream<T>, fn: (T) => V): Stream<V>;

export function filter<T>(stream: Stream<T>, predicate: (T) => boolean): Stream<T>;

