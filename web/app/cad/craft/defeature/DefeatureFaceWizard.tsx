import React, {useContext} from 'react';
import {Dialog} from "ui/components/Dialog";
import {NOOP} from "gems/func";
import {ReactApplicationContext} from "../../dom/ReactApplicationContext";
import {readShellEntityFromJson} from "../../scene/wrappers/entityIO";
import {DEFLECTION} from "../e0/common";
import {MFace} from "../../model/mface";


export function DefeatureFaceWizard() {

  const ctx = useContext(ReactApplicationContext);


  return <Dialog title='Defeaturing' onClose={NOOP}>

    <button onClick={() => {
      ctx.craftService.models$.update((models) => {
        const [cube] = models;
        const result = ctx.craftEngine.modellingEngine.defeatureFaces({
          deflection: DEFLECTION,
          shape: cube.brepShell.data.externals.ptr,
          faces: ctx.services.selection.face.objects.map((f: MFace) => f.brepFace.data.externals.ptr)
        })


        const mShell = readShellEntityFromJson(result);
        return [mShell];
      });

  //     addShellOnScene(result);
    }
    }>Defeature</button>

  </Dialog>

}