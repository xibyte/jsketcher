import {WorkbenchConfig} from "cad/workbench/workbenchService";

//imports of feature history type commands
import {AutoRouteOperation} from "./features/autoRoute/autoRoute.operation";
import {GiFoldedPaper} from "react-icons/gi";


//imports of action type commands



export const RoutingElectricalWorkspace: WorkbenchConfig = {

  workbenchId: 'RoutingElectrical',
  features: [
    AutoRouteOperation,
    
  ],
  actions: [],
  ui: {
    toolbar: [
      'DATUM_CREATE', 'PLANE', 'EditFace', '-',
      'RE_AUTO_ROUTE',
    ]
  },
  icon: GiFoldedPaper
}