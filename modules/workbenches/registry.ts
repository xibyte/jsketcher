import {ModelerWorkspace} from "workbenches/modeler";
import {SheetMetalWorkspace} from "workbenches/sheetMetal";
// import { RoutingElectricalWorkspace } from "./routingElectrical";
import {WorkbenchConfig} from "cad/workbench/workbenchService";


export const WorkbenchRegistry: WorkbenchConfig[] = [
    ModelerWorkspace, 
    SheetMetalWorkspace, 
    //RoutingElectricalWorkspace,
]