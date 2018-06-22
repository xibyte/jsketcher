import {CombineStream} from './combine';
import {StateStream} from './state';
import {Emitter} from './emitter';
import {FilterStream, MapStream} from './base';

export function combine(...streams) {
  return new CombineStream(streams);
}

export function stream() {
  return new Emitter();
}

export function state(initialValue) {
  return new StateStream(initialValue);
}

export const map = MapStream.create;

export const filter = FilterStream.create;
 
export const merger = states => states.reduce((acc, v) => Object.assign(acc, v), {});
