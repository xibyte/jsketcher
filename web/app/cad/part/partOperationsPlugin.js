import boxOperation from '../craft/primitives/boxOperation';
import extrudeOperation from '../craft/cutExtrude/extrudeOperation';
import cutOperation from '../craft/cutExtrude/cutOperation';
import planeOperation from "../craft/primitives/planeOperation";

export function activate({services}) {
  services.operation.registerOperations([
    planeOperation,
    boxOperation, 
    extrudeOperation,
    cutOperation
  ])
}