import modellerUISubject from "./subjects/modellerUISubject";
import {createSketcherSubject} from "./subjects/sketcherUISubject";

export const ModesConfig = {
  modellerUI: {
    testSubject: win => modellerUISubject(win.__CAD_APP),
    startPage: 'http://localhost:3000/index.html#TestProject'
  },
  sketcherUI: {
    testSubject: win => createSketcherSubject(win.__CAD_APP),
    startPage: 'http://localhost:3000/index.html#TestProject'
  },
};