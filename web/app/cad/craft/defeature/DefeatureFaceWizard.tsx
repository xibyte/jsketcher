import React, {useContext} from 'react';
import {Dialog} from "ui/components/Dialog";
import {NOOP} from "gems/func";
import {ReactApplicationContext} from "../../dom/ReactApplicationContext";
import {MFace} from "../../model/mface";


export function DefeatureFaceWizard() {

  const ctx = useContext(ReactApplicationContext);


  return <Dialog title='Defeaturing' onClose={NOOP}>

    <button onClick={() => {
      throw 'Defeaturing is not yet implemented with native engine';
    }
    }>Defeature</button>

  </Dialog>

}
