import {useCallback, useContext, useEffect, useState} from 'react';
import {StreamsContext} from "./streamsContext";
import {ApplicationContext} from "cad/context";
import {Emitter, Stream} from "lstream";
import produce from "immer";

export function useStream<T>(getStream: Stream<T> | ((ctx: ApplicationContext) => Stream<T>)) : T {

  const basicStreams = useContext(StreamsContext);
  const [state, setState] = useState<{data: T}>();

  const stream: Emitter<T> = resolveStream(getStream, basicStreams);

  if (!stream) {
    console.log(getStream);
    throw "no stream ^";
  }

  useEffect(() => stream.attach(data => setState({data})), [stream]);

  // @ts-ignore
  return state ? state.data : (stream.value !== undefined  ? stream.value : null);
}

export function useStreamWithUpdater<T>(getStream: (ctx: ApplicationContext) => Emitter<T>) : [T, (val: T|((T) => T)) => void] {

  const data = useStream(getStream);
  const basicStreams = useContext(StreamsContext);

  const stream = resolveStream(getStream, basicStreams);

  const updater = useCallback((val) => {

    if (typeof val === 'function') {
      val = val(data)
    }
    stream.next(val)

  }, [data, stream]);

  return [data, updater];

}

export type Patcher<T> = (draft: T) => void;

export function useStreamWithPatcher<T>(getStream: (ctx: ApplicationContext) => Emitter<T>) : [T, (patcher: Patcher<T>) => void] {

  const data = useStream(getStream);
  const basicStreams = useContext(StreamsContext);

  const stream: Emitter<T> = resolveStream(getStream, basicStreams);

  const patch = (patcher: Patcher<T>) => {
    const newData: T = produce(data, (draft:T) => {
      patcher(draft)
    })
    stream.next(newData);
  }

  return [data, patch];

}

function resolveStream<T>(getStream, basicStreams): Emitter<T> {
  return typeof getStream === 'function' ? getStream(basicStreams) : getStream
}
