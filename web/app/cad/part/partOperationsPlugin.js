import boxOperation from '../craft/primitives/boxOperation';
import extrudeOperation from '../craft/cutExtrude/extrudeOperation';

export function activate({services}) {
  services.operation.registerOperations([
    boxOperation, 
    extrudeOperation
  ])
}