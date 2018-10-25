import boxOperation from '../craft/primitives/boxOperation';
import extrudeOperation from '../craft/cutExtrude/extrudeOperation';
import cutOperation from '../craft/cutExtrude/cutOperation';
import planeOperation from '../craft/primitives/planeOperation';
import filletOperation from '../craft/fillet/filletOperation';
import revolveOperation from '../craft/revolve/revolveOperation';
import createDatumOperation from '../craft/datum/create/createDatumOperation';
import moveDatumOperation from '../craft/datum/move/moveDatumOperation';
import rotateDatumOperation from '../craft/datum/rotate/rotateDatumOperation';

export function activate({services}) {
  services.operation.registerOperations([
    planeOperation,
    boxOperation, 
    extrudeOperation,
    cutOperation,
    revolveOperation,
    filletOperation,
    createDatumOperation,
    moveDatumOperation,
    rotateDatumOperation
  ])
}