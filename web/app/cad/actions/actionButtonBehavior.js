import {TOKENS as ACTION_TOKENS} from "./actionSystemPlugin";

export function mapActionBehavior(actionIdProp) {
  return ({dispatch}, props) => {
    const actionId = props[actionIdProp];
    const actionRunToken = ACTION_TOKENS.actionRun(actionId);

    let request = {actionId, x:0, y:0};
    let canceled = true;
    let showed = false;

    function updateCoords({pageX, pageY}) {
      request.x = pageX + 10;
      request.y = pageY + 10;
    }
    
    return {
      onClick: data => dispatch(actionRunToken, data),
      onMouseEnter: e => {
        updateCoords(e);
        canceled = false;
        showed = false;
        setTimeout(() => {
          if (!canceled) {
            showed = true;
            dispatch(ACTION_TOKENS.SHOW_HINT_FOR, request)
          }
        }, 500);
      },
      onMouseMove: updateCoords,
      onMouseLeave: () => {
        canceled = true;
        if (showed) {
          dispatch(ACTION_TOKENS.SHOW_HINT_FOR, null)
        }
      }
  }};
}
