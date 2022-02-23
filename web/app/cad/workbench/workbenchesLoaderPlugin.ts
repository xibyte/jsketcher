import {ApplicationContext, CoreContext} from "context";
import {WorkbenchRegistry} from "workbenches/registry";
import planeOperation from "cad/craft/primitives/simplePlane/simplePlaneOperation";
import boxOperation from "cad/craft/primitives/box/boxOperation";
import cutOperation from "cad/craft/cutExtrude/cutOperation";
import revolveOperation from "cad/craft/revolve/revolveOperation";
import filletOperation from "cad/craft/fillet/filletOperation";
import createDatumOperation from "cad/craft/datum/create/createDatumOperation";
import moveDatumOperation from "cad/craft/datum/move/moveDatumOperation";
import rotateDatumOperation from "cad/craft/datum/rotate/rotateDatumOperation";
import datumOperation from "cad/craft/primitives/plane/planeOperation";
import sphereOperation from "cad/craft/primitives/sphere/sphereOperation";
import cylinderOperation from "cad/craft/primitives/cylinder/cylinderOperation";
import torusOperation from "cad/craft/primitives/torus/torusOperation";
import coneOperation from "cad/craft/primitives/cone/coneOperation";
import spatialCurveOperation from "cad/craft/spatialCurve/spatialCurveOperation";
import loftOperation from "cad/craft/loft/loftOperation";
import {intersectionOperation, subtractOperation, unionOperation} from "cad/craft/boolean/booleanOperation";
import {Plugin} from "plugable/pluginSystem";
import {WorkbenchService} from "cad/workbench/workbenchService";
import {OperationService} from "cad/craft/operationPlugin";
import {checkAllPropsDefined} from "plugable/utils";

export interface WorkbenchesLoaderContext {
  workbenchService: WorkbenchService,
  operationService: OperationService
}

export const WorkbenchesLoaderPlugin: Plugin<ApplicationContext, WorkbenchesLoaderContext> = {

  readiness(ctx: ApplicationContext): WorkbenchesLoaderContext {

    const {
      workbenchService,
      operationService
    } = ctx;

    return checkAllPropsDefined({
      workbenchService,
      operationService
    })
  },

  activate(ctx: WorkbenchesLoaderContext) {
    registerCoreOperations(ctx);
    WorkbenchRegistry.forEach(wConfig => ctx.workbenchService.registerWorkbench(wConfig));
    ctx.workbenchService.switchToDefaultWorkbench();
  },

}

function registerCoreOperations(ctx: WorkbenchesLoaderContext) {

  ctx.operationService.registerOperations([
    planeOperation,
    boxOperation,
    // extrudeOperation,
    cutOperation,
    revolveOperation,
    filletOperation,
    createDatumOperation,
    moveDatumOperation,
    rotateDatumOperation,
    datumOperation,
    sphereOperation,
    cylinderOperation,
    torusOperation,
    coneOperation,
    spatialCurveOperation,
    loftOperation,
    intersectionOperation,
    subtractOperation,
    unionOperation,
  ]);
}