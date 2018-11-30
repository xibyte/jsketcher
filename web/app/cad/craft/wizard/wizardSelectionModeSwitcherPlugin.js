
export function activate(ctx) {
  ctx.streams.wizard.workingRequest.attach(({type}) => {
    if (type) {
      let operation = ctx.services.operation.get(type);
      if (operation.selectionMode) {
        ctx.services.pickControl.setSelectionMode(operation.selectionMode);
      }
    } else {
      ctx.services.pickControl.switchToDefaultSelectionMode();
    }
  });
}