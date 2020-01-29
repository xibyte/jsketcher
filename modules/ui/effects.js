import React, {useContext, useEffect, useState} from 'react';
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

const EMPTY_ARR = [];