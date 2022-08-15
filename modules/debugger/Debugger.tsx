import React, {useContext, useState} from 'react';
import Window from "ui/components/Window";
import {state} from "lstream";
import {useStream} from "ui/effects";

// @ts-ignore
import bottleExample from "raw-loader!./bottleExample.txt";
import {ApplicationContext} from "cad/context";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

export const DebugMode$ = state(false);

export function Debugger() {

  const debugMode: boolean = useStream(DebugMode$);
  const [codeText, setCodeText] = useState<string>(bottleExample);
  const context: ApplicationContext = useContext(ReactApplicationContext);

  function evalCode() {
    eval(codeText);
  }

  if (!debugMode) {
    return null;
  }

  return <Window initWidth={500} initRight={10} initTop={5} initHeight={700}
                 title="Debugger"
                 enableResize={true}
                 onClose={() => DebugMode$.next(null)}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <textarea onChange={e => setCodeText(e.target.value)} style={{

        flex: 1,

      }} value={codeText}/>
      <button onClick={evalCode}>RUN</button>
    </div>
  </Window>;

}