import React from "react";
import {AiOutlineEye} from "react-icons/ai";
import {state, StateStream} from "lstream";
import {useStreamWithPatcher} from "ui/effects";

class LazyStreams<T> {

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

export interface ModelAttributes {

  hidden: boolean

}

const modelAttrStreams = new LazyStreams<ModelAttributes>(id => ({} as ModelAttributes));

