import React, {useContext} from 'react';
import {useStreamWithUpdater} from "ui/effects";
import ls from "./StageControl.less";
import {SketcherAppContext} from "./SketcherAppContext";

export function StageControl() {

  const [stages, setStages] = useStreamWithUpdater(ctx => ctx.viewer.parametricManager.$stages);
  const {viewer} = useContext(SketcherAppContext);

  const setStage = pointer => setStages(stages => ({
    ...stages,
    pointer
  }));

  const createStage = () => viewer.parametricManager.newStage();


  return <div className={ls.root}>
    {stages.list.map((stage, i) => <div key={stage.index}><button onClick={() => setStage(i)}>{i}.</button></div>)}
    <div><button onClick={createStage}>+</button></div>
  </div>
}

