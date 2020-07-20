import constraintGlobalActions from "./actions/constraintGlobalActions";
import measureActions from "./actions/measureActions";
import objectToolActions from "./actions/objectToolActions";
import commonActions from "./actions/commonActions";
import {insertAfter, removeInPlace} from "gems/iterables";
import generalToolActions from "./actions/generalToolActions";

export const sketcherRightToolbarConfig = constraintGlobalActions.map(a => a.id);

export const sketcherTopToolbarConfig = [
  ...commonActions.map(a => a.id),
  ...generalToolActions.map(a => a.id),
  ...objectToolActions.map(a => a.id),
  'Offset',
  '-',
  ...measureActions.map(a => a.id)
];

insertAfter(sketcherTopToolbarConfig, 'Export', '-');
insertAfter(sketcherTopToolbarConfig, 'PanTool', '-');
insertAfter(sketcherTopToolbarConfig, 'BezierTool', '-');

removeInPlace(sketcherTopToolbarConfig, 'ToggleTerminal');