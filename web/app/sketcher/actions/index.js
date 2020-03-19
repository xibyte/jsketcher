import constraintActions from "./constraintActions";
import {getDescription, MatchIndex, matchSelection} from "../selectionMatcher";
import {toast} from "react-toastify";
import operationActions from "./operationActions";
import constraintGlobalActions from "./constraintGlobalActions";
import measureActions from "./measureActions";
import toolActions from "./toolActions";
import commonActions from "./commonActions";

const ALL_CONTEXTUAL_ACTIONS = [
  ...constraintActions,
  ...operationActions,
];

const ACTIONS = [
  ...constraintGlobalActions,
  ...measureActions,
  ...toolActions,
  ...commonActions
  //keep going here
];

const ALL_ACTIONS = [
  ...ALL_CONTEXTUAL_ACTIONS,
  ...ACTIONS
];

const index = {};
ALL_ACTIONS.forEach(a => index[a.id] = a);
Object.freeze(index);

export function matchAvailableActions(selection) {

  let matched = [];
  let matchIndex = new MatchIndex(selection);

  if (selection.length) {
    for (let action of  ALL_CONTEXTUAL_ACTIONS) {
      if (action.selectionMatcher && matchSelection(action.selectionMatcher, matchIndex, true)) {
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
export function runActionOrToastWhyNot(actionId, ctx, silent) {
  const selection = ctx.viewer.selected;
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

export function startOperation(ctx, actionId) {

  const action = index[actionId];
  if (action.wizard) {
    ctx.ui.$wizardRequest.next({
      title: action.shortName,
      schema: action.wizard,
      onApply: (params) => action.invoke(ctx, params)
    })
  }

}