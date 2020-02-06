import constraintActions from "./constraintActions";
import {sortSelectionByType} from "./matchUtils";

const ALL_CONTEXTUAL_ACTIONS = [
  ...constraintActions,
  //keep going here
];

export function matchAvailableActions(selection) {

  let sortedByType = sortSelectionByType(selection);
  let matched = [];


  if (selection.length) {
    for (let action of  ALL_CONTEXTUAL_ACTIONS) {

      if (Array.isArray(action.selectionMatcher)) {
        action.selectionMatcher.forEach(matcher => {
          if (matcher(selection, sortedByType)) {
            matched.push(action);
          }
        })
      } else {
        if (action.selectionMatcher(selection, sortedByType)) {
          matched.push(action);
        }
      }

    }
  }

  return matched;

}