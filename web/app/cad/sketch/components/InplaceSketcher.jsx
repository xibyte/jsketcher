import React from 'react';
import {useStream} from "ui/effects";
import {StreamsContext} from "ui/streamsContext";
import {SketcherAppContext} from "../../../sketcher/components/SketcherAppContext";
import {Scope} from "../../../sketcher/components/Scope";

export function InplaceSketcher({children}) {

  const sketcherAppContext = useStream(ctx => ctx.streams.sketcher.sketcherAppContext);

  if (sketcherAppContext === null) {
    return null;
  }

  return <SketcherAppContext.Provider value={sketcherAppContext}>
    <StreamsContext.Provider value={sketcherAppContext}>
      <Scope>{children}</Scope>
    </StreamsContext.Provider>
  </SketcherAppContext.Provider>
}