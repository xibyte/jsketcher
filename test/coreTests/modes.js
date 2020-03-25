import modellerUISubject from "./subjects/modellerTPI";
import {createSketcherTPI} from "./subjects/sketcherTPI";
import {constant} from "lstream";

export const ModesConfig = {
  modellerUI: {
    testSubject: win => modellerUISubject(win.__CAD_APP),
    startPage: 'http://localhost:3000/index.html#TestProject',
    loadStream: win => win.__CAD_APP.streams.lifecycle.projectLoaded
  },
  sketcherUI: {
    testSubject: win => createSketcherTPI(win.__CAD_APP),
    startPage: 'http://localhost:3000/sketcher.html#TestProject',
    loadStream: win => constant(true)
  },
};