import {WorkbenchConfig} from "cad/workbench/workbenchService";

//imports of feature history type commands
import {smTabOperation} from "./features/smTab/smTab.operation";
import {smFlangeOperation} from "./features/smFlange/smFlange.operation";
import {GiFoldedPaper} from "react-icons/gi";


//imports of action type commands



export const SheetMetalWorkspace: WorkbenchConfig = {

  workbenchId: 'SheetMetal',
  features: [
    smTabOperation,
    smFlangeOperation,
    
  ],
  actions: [],
  ui: {
    toolbar: [
      ['DATUM_CREATE', 'PLANE', 'EditFace',],
      ["SM_TAB","SM_FLANGE", "EXTRUDE"],
      ["BOOLEAN",], 
      ["FILLET_TOOL", ],
      ["MIRROR_BODY", "PATTERN_LINEAR", "PATTERN_RADIAL", "MOVE_BODY"] , 
      ["HOLE_TOOL",],
      
    ]
  },
  icon: GiFoldedPaper
}