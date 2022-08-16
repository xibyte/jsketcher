
export function enableAnonymousActionHint(ctx) {
  return function(actionId) {
    const {services, actionService} = ctx;
    const {left, top} = services.dom.viewerContainer.getBoundingClientRect();
    actionService.showHintFor({
      actionId,
      x: left + 100,
      y: top + 10,
      requester: 'anonymous'
    });
    setTimeout(() => {
      const value = actionService.hint$.value;
      if (value && value.requester !== 'anonymous') {
        actionService.showHintFor(null);
      }
    }, 1000);
  }
}