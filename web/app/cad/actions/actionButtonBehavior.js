import {TOKENS as ACTION_TOKENS} from "./actionSystemPlugin";

export function mapActionBehavior(actionIdProp) {
  return ({dispatch}, props) => {
    const actionId = props[actionIdProp];
    const actionRunToken = ACTION_TOKENS.actionRun(actionId);
    return {
      onClick: data => dispatch(actionRunToken, data),
      onMouseEnter: ({pageX, pageY}) => dispatch(ACTION_TOKENS.SHOW_HINT_FOR, [actionId, pageX, pageY]),
      onMouseLeave: () => dispatch(ACTION_TOKENS.SHOW_HINT_FOR, null)
  }};
}