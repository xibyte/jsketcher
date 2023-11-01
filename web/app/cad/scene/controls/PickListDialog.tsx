import React, {useContext} from "react";
import {state} from "lstream";
import {useStreamWithUpdater} from "ui/effects";
import Window from "ui/components/Window";
import {MObject} from "cad/model/mobject";
import Stack from "ui/components/Stack";
import {ModelButton} from "cad/craft/ui/ModelButton";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";


export interface PickListDialogRequest {
  x: number;
  y: number;
  token: any;
  capture: MObject[]
}

export const PickListDialogRequest$ = state<PickListDialogRequest>(null);

export function PickListDialog() {

  const [req, setReq] = useStreamWithUpdater(() => PickListDialogRequest$);

  const ctx = useContext(ReactApplicationContext);

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
      {req.capture
        .filter(model => ctx.pickControlService.isSelectionEnabledFor(model))
        .map(model => {
          return <ModelButton
            key={model.id}
            model={model}
          />
        })}
    </Stack>
  </Window>

}

