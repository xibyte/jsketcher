import boxOperation from '../craft/primitives/boxOperation';
import extrudeOperation from '../craft/cutExtrude/extrudeOperation';
import cutOperation from '../craft/cutExtrude/cutOperation';

export function activate({services}) {
  services.operation.registerOperations([
    boxOperation, 
    extrudeOperation,
    cutOperation
  ])
}