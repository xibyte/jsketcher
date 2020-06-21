import {useCallback, useContext, useEffect, useState} from 'react';
import {StreamsContext} from "./streamsContext";
import {ApplicationContext} from "context";
import {Emitter, Stream} from "lstream";

export function useStream<T>(getStream: (ctx: ApplicationContext) => Stream<T>) : T {

  const basicStreams = useContext(StreamsContext);
  const [state, setState] = useState<{data: T}>();

  const stream = resolveStream(getStream, basicStreams);

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

function resolveStream(getStream, basicStreams) {
  return typeof getStream === 'function' ? getStream(basicStreams) : getStream
}
