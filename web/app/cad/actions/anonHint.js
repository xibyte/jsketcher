
export function enableAnonymousActionHint(ctx) {
  const {services, actionService} = ctx;
  return function(actionId) {
    let {left, top} = services.dom.viewerContainer.getBoundingClientRect();
    actionService.showHintFor({
      actionId,
      x: left + 100,
      y: top + 10,
      requester: 'anonymous'
    });
    setTimeout(() => {
      let value = actionService.hint$.value;
      if (value && value.requester !== 'anonymous') {
        actionService.showHintFor(null);
      }
    }, 1000);
  }
}