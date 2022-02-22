import {ModelerWorkspace} from "workbenches/modeler";
import {ExampleWorkspace} from "workbenches/examples";
import {WorkbenchConfig} from "cad/workbench/workbenchService";

export const WorkbenchRegistry: WorkbenchConfig[] = [
    ModelerWorkspace,
    // ExampleWorkspace,
]