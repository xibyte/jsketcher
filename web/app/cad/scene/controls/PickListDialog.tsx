import React from "react";
import {state} from "lstream";
import {useStreamWithUpdater} from "ui/effects";
import Window from "ui/components/Window";
import {MObject} from "cad/model/mobject";
import Stack from "ui/components/Stack";
import {ModelSection} from "cad/craft/ui/SceneInlineObjectExplorer";
import {ModelButton} from "cad/craft/ui/ModelButton";


export interface PickListDialogRequest {
  x: number;
  y: number;
  token: any;
  capture: MObject[]
}

export const PickListDialogRequest$ = state<PickListDialogRequest>(null);

export function PickListDialog() {

  const [req, setReq] = useStreamWithUpdater(() => PickListDialogRequest$);

  const close = () => setReq(null);

  if (!req) {
    return null;
  }

  return <Window key={req.token}
                 initWidth={250}
                 initLeft={req.x}
                 initTop={req.y}
                 title='pick list'
                 className='small-typography'
                 onClose={close}>
    <Stack>
    {req.capture.map(model => {
      return <ModelButton
        key={model.id}
        model={model}
      />
    })}
    </Stack>
  </Window>

}

