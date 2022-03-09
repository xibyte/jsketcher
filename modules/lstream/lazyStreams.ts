import {state, StateStream} from "lstream/index";

export class LazyStreams<T> {

  index = new Map<string, StateStream<T>>();
  proto: (id: string) => T;

  constructor(proto?: (id: string) => T) {
    this.proto = proto || ((id: string) => null);
  }

  get(id: string) {

    let state$: StateStream<T> = this.index[id];
    if (state$ == null) {
      state$ = state<T>(this.proto(id));
      this.index[id] = state$;
    }
    return state$;
  }

}