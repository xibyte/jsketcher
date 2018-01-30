import {TOKENS} from "./actionSystemPlugin";

export function enableAnonymousActionHint({bus, services}) {
 
  let autoHideCanceled = true;
  bus.subscribe(TOKENS.SHOW_HINT_FOR, () => autoHideCanceled = true);
  
  return function(actionId) {
    let {left, top} = services.dom.viewerContainer.getBoundingClientRect();
    bus.dispatch(TOKENS.SHOW_HINT_FOR, {
      actionId,
      x: left + 100,
      y: top + 10
    });
    autoHideCanceled = false; 
    setTimeout(() => {
      if (!autoHideCanceled) {
        bus.dispatch(TOKENS.SHOW_HINT_FOR, null);
      }
    }, 1000);
  }
}