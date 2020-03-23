import constraintGlobalActions from "./actions/constraintGlobalActions";
import measureActions from "./actions/measureActions";
import toolActions from "./actions/toolActions";
import commonActions from "./actions/commonActions";
import {removeInPlace} from "../../../modules/gems/iterables";

export const sketcherRightToolbarConfig = constraintGlobalActions.map(a => a.id);

export const sketcherTopToolbarConfig = [
  ...commonActions.map(a => a.id),
  ...toolActions.map(a => a.id),
  'Offset',
  '-',
  ...measureActions.map(a => a.id)
];

insertAfter(sketcherTopToolbarConfig, 'Export', '-');
insertAfter(sketcherTopToolbarConfig, 'PanTool', '-');
insertAfter(sketcherTopToolbarConfig, 'BezierTool', '-');

function insertAfter(arr, item, toAdd) {
  const index = arr.indexOf(item);
  if (index !== -1) {
    arr.splice(index+1, 0, toAdd);
  }
}

removeInPlace(sketcherTopToolbarConfig, 'ToggleTerminal');