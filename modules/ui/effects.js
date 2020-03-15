import React, {useCallback, useContext, useEffect, useState} from 'react';
import {StreamsContext} from "./streamsContext";

export function useStream(getStream) {

  const basicStreams = useContext(StreamsContext);
  const [state, setState] = useState();

  const stream = getStream(basicStreams);

  if (!stream) {
    console.log(getStream);
    throw "no stream ^";
  }

  useEffect(() => stream.attach(data => setState({data})), EMPTY_ARR);

  return state ? state.data : (stream.value ? stream.value : null);

}

export function useStreamWithUpdater(getStream) {

  const data = useStream(getStream);
  const basicStreams = useContext(StreamsContext);

  const stream = getStream(basicStreams);

  const updater = useCallback((val) => {

    if (typeof val === 'function') {
      val = val(data)
    }
    stream.next(val)

  }, [data, stream]);

  return [data, updater];

}


const EMPTY_ARR = [];