import constraintActions from "./constraintActions";
import {getDescription, matchAvailableSubjects, MatchIndex, matchSelection} from "../selectionMatcher";
import {toast} from "react-toastify";
import operationActions from "./operationActions";
import constraintGlobalActions from "./constraintGlobalActions";
import measureActions from "./measureActions";
import objectToolActions from "./objectToolActions";
import commonActions from "./commonActions";
import exportActions from "./exportActions";
import generalToolActions from "./generalToolActions";

const ALL_CONTEXTUAL_ACTIONS = [
  ...constraintActions,
  ...operationActions,
];

const ACTIONS = [
  ...constraintGlobalActions,
  ...measureActions,
  ...generalToolActions,
  ...objectToolActions,
  ...commonActions,
  ...exportActions
  //keep going here
];

export const ALL_ACTIONS = [
  ...ALL_CONTEXTUAL_ACTIONS,
  ...ACTIONS
];
Object.freeze(ALL_ACTIONS);

const index = {};
ALL_ACTIONS.forEach(a => index[a.id] = a);
Object.freeze(index);

export function matchAvailableActions(selection) {
  return matchAvailableSubjects(selection, ALL_CONTEXTUAL_ACTIONS);
}

export function getSketcherAction(actionId) {
  return index[actionId];
}

export function getAllSketcherActions() {
  return ALL_ACTIONS;
}

export function getSketcherActionIndex() {
  return index;
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