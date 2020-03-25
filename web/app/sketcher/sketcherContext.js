import {Viewer} from './viewer2d.js'
import {IO} from './io'
import React from "react";
import {state, stream} from "lstream";
import {getSketcherActionIndex} from "./actions";
import {Project} from "./project";


export function createAppContext() {

  const viewer = new Viewer(document.getElementById('viewer'), IO);

  return {

    viewer,
    project: new Project(viewer),

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



