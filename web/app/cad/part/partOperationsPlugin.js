import boxOperation from '../craft/primitives/boxOperation';

export function activate({bus, services}) {
  services.operation.registerOperations([
    boxOperation
  ])
}