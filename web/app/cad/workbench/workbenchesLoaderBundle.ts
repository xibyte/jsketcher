import {WorkbenchRegistry} from "workbenches/registry";
import planeOperation from "workbenches/modeler/features/plane/simplePlaneOperation";
import createDatumOperation from "cad/craft/datum/create/createDatumOperation";
import moveDatumOperation from "cad/craft/datum/move/moveDatumOperation";
import rotateDatumOperation from "cad/craft/datum/rotate/rotateDatumOperation";

import {Bundle} from "bundler/bundleSystem";
import {WorkbenchService} from "cad/workbench/workbenchService";
import {OperationService} from "cad/craft/operationBundle";

interface WorkbenchesLoaderActivationContext {
  workbenchService: WorkbenchService,
  operationService: OperationService
}

type WorkbenchesLoaderWorkingContext = WorkbenchesLoaderActivationContext;

export const WorkbenchesLoaderBundle: Bundle<WorkbenchesLoaderWorkingContext> = {

  activationDependencies: [
    '@Workbench', '@Operation'
  ],

  activate(ctx: WorkbenchesLoaderWorkingContext) {
    registerCoreOperations(ctx);
    WorkbenchRegistry.forEach(wConfig => ctx.workbenchService.registerWorkbench(wConfig));
    ctx.workbenchService.switchToDefaultWorkbench();
  },

  BundleName: "@WorkbenchesLoader",
}

function registerCoreOperations(ctx: WorkbenchesLoaderActivationContext) {

  ctx.operationService.registerOperations([
    planeOperation,
    createDatumOperation,
    moveDatumOperation,
    rotateDatumOperation,
  ] as any);
}