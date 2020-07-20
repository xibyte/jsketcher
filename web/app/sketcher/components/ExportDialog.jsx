import React from 'react';
import {useStreamWithUpdater} from "ui/effects";
import Window from "ui/components/Window";
import Stack from "ui/components/Stack";
import {SketcherActionButton} from "./SketcherActionButton";

export function ExportDialog() {

  const [request, setRequest] = useStreamWithUpdater(ctx => ctx.ui.$exportDialogRequest);

  if (!request) {
    return null;
  }
  const x = request.x || 200;
  const y = request.y || 200;
  return <Window title='Format'  initLeft={x} initTop={y}
                 className='sketcher-window'
                 onClose={() => setRequest(null)}>

    <Stack style={style}>
      <div><SketcherActionButton actionId='ExportSVG' text={true}/></div>
      <div><SketcherActionButton actionId='ExportDXF' text={true}/></div>
    </Stack>
  </Window>
}

const style = {
  fontSize: 12,
};