
export function enableAnonymousActionHint({streams, services}) {
 
  return function(actionId) {
    let {left, top} = services.dom.viewerContainer.getBoundingClientRect();
    services.action.showHintFor({
      actionId,
      x: left + 100,
      y: top + 10,
      requester: 'anonymous'
    });
    setTimeout(() => {
      let value = streams.action.hint.value;
      if (value && value.requester !== 'anonymous') {
        services.action.showHintFor(null);
      }
    }, 1000);
  }
}