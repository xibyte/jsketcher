import React from 'react';
import {useStreamWithUpdater} from "ui/effects";

const style = {
  width: '100%',
  resize: 'vertical',
  height: 100,
  background: 'inherit',
  border : 'none',
  color: '#C4E1A4'
};

export function SketcherDimensionView() {

  const [definitions, setDefinitions] = useStreamWithUpdater(ctx => ctx.viewer.parametricManager.$constantDefinition);

  return <textarea style={style} id='dimTextArea' placeholder='for example: A = 50' value={definitions||''} onChange={e => setDefinitions(e.target.value||null)}/>

}
