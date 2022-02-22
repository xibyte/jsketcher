import OCCBottle from './features/occ_bottle';
import {WorkbenchConfig} from "cad/workbench/workbenchService";

export const ExampleWorkspace: WorkbenchConfig = {
  workbenchId: 'examples',
  features: [
    OCCBottle,
  ],
  actions: [],
  ui: {
    toolbar: []
  }
}