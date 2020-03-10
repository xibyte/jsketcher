import constraintActions from "./constraintActions";
import {getDescription, MatchIndex, matchSelection} from "../selectionMatcher";
import {toast} from "react-toastify";

const ALL_CONTEXTUAL_ACTIONS = [
  ...constraintActions,
  //keep going here
];

const index = {};
ALL_CONTEXTUAL_ACTIONS.forEach(a => index[a.id] = a);
Object.freeze(index);

export function matchAvailableActions(selection) {

  let matched = [];
  let matchIndex = new MatchIndex(selection);

  if (selection.length) {
    for (let action of  ALL_CONTEXTUAL_ACTIONS) {
      if (matchSelection(action.selectionMatcher, matchIndex, true)) {
        matched.push(action);
      }
    }
  }

  return matched;
}

export function getSketcherAction(actionId) {
  return index[actionId];
}

//For backward compatibility
export function runActionOrToastWhyNot(actionId, selection, ctx, silent) {
  const action = index[actionId];
  if (action) {
    const matched = matchSelection(action.selectionMatcher, new MatchIndex(selection), false);
    if (matched) {
      action.invoke(ctx, matched)
    } else {

      const msg = 'The action "' + action.shortName + ' ' + action.kind + '" requires selection of ' +  getDescription(action.selectionMatcher);
      if (silent) {
        return msg;
      } else {
        toast(msg);
      }
    }
  }
}