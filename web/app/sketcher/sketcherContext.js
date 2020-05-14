import {Viewer} from './viewer2d'
import {IO} from './io'
import React from "react";
import {state, stream} from "lstream";
import {getSketcherActionIndex} from "./actions";
import {Project} from "./project";


export function createAppContext() {
  const ctx = createEssentialAppContext(document.getElementById('viewer'));
  ctx.project = new Project(ctx.viewer);
  return ctx;
}

export function createEssentialAppContext(canvas) {

  return {

    viewer: new Viewer(canvas, IO),

    get actions() {
      return getSketcherActionIndex();
    },
    ui: {
      $constraintEditRequest: stream(),
      $wizardRequest: stream(),
      $sketchManagerRequest: stream(),
      $exportDialogRequest: stream(),
      $showTerminalRequest: state(null),
      $terminalOutput: state([])
    },
    printToTerminal(text) {
      this.ui.$terminalOutput.mutate(output => output.push({
        text
      }));
    }
  };
}


