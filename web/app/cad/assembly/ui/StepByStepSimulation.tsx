import React, {useContext, useState} from "react";
import {ReactApplicationContext} from "../../dom/ReactApplicationContext";
import {AssemblyProcess} from "../assemblySolver";
import {useStream} from "ui/effects";

export function StepByStepSimulation() {

  const ctx = useContext(ReactApplicationContext);

  const [process, setProcess] = useState<AssemblyProcess>(null);
  const constraints = useStream(ctx => ctx.assemblyService.constraints$);


  function stepByStepSimulation() {
    if (process === null || process.isDone()) {
      const newProcess = new AssemblyProcess(ctx.cadRegistry, constraints);
      newProcess.begin();
      setProcess(newProcess);
    } else {
      process.step();
    }
  }

  return <button onClick={stepByStepSimulation}>step</button>

}
