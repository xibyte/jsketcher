import {WorkbenchRegistry} from "workbenches/registry";
import planeOperation from "cad/craft/primitives/simplePlane/simplePlaneOperation";
import createDatumOperation from "cad/craft/datum/create/createDatumOperation";
import moveDatumOperation from "cad/craft/datum/move/moveDatumOperation";
import rotateDatumOperation from "cad/craft/datum/rotate/rotateDatumOperation";
import datumOperation from "cad/craft/primitives/plane/planeOperation";
import {Plugin} from "plugable/pluginSystem";
import {WorkbenchService} from "cad/workbench/workbenchService";
import {OperationService} from "cad/craft/operationPlugin";

export interface WorkbenchesLoaderInputContext {
  workbenchService: WorkbenchService,
  operationService: OperationService
}

export const WorkbenchesLoaderPlugin: Plugin<WorkbenchesLoaderInputContext, {}> = {

  inputContextSpec: {
    workbenchService: 'required',
    operationService: 'required'
  },

  outputContextSpec: {},

  activate(ctx) {
    registerCoreOperations(ctx);
    WorkbenchRegistry.forEach(wConfig => ctx.workbenchService.registerWorkbench(wConfig));
    ctx.workbenchService.switchToDefaultWorkbench();
  }

}

function registerCoreOperations(ctx: WorkbenchesLoaderInputContext) {

  ctx.operationService.registerOperations([
    planeOperation,
    createDatumOperation,
    moveDatumOperation,
    rotateDatumOperation,
    datumOperation,
  ] as any);
}