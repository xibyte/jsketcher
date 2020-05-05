import React from 'react';
import {useStream} from "../../../../../modules/ui/effects";

export default function SketcherMode({children}) {

  const visible = useStream(ctx => ctx.streams.sketcher.sketchingMode);

  if (!visible) {
    return null;
  }

  return children;
}