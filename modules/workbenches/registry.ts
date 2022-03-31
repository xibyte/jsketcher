import {ModelerWorkspace} from "workbenches/modeler";
import { sheetMetalWorkspace } from "workbenches/sheetMetal";
import {WorkbenchConfig} from "cad/workbench/workbenchService";


export const WorkbenchRegistry: WorkbenchConfig[] = [
    ModelerWorkspace, sheetMetalWorkspace
]