import {startOperation} from "../../sketcher/actions";
import objectToolActions from '../../sketcher/actions/objectToolActions';
import measureActions from '../../sketcher/actions/measureActions';
import {insertAfter} from 'gems/iterables';
import operationActions from "../../sketcher/actions/operationActions";
import constraintGlobalActions from "../../sketcher/actions/constraintGlobalActions";
import generalToolActions from "../../sketcher/actions/generalToolActions";
import sketcherControlActions from "./sketcherControlActions";

export default function ({services, streams}) {
  services.action.registerActions(sketcherControlActions);
  services.action.registerActions([
    ...constraintGlobalActions,
    ...measureActions,
    ...generalToolActions,
    ...objectToolActions,
    ...operationActions,

  ].map(convertSketcherAction));

}

const SKETCHER_PREFIX = 'sketcher.';

function toSketcherActionId(id) {
  return SKETCHER_PREFIX + id;
}

function convertSketcherAction(action) {

  return   {
    id: toSketcherActionId(action.id),
    appearance: {
      icon: action.icon,
      label: action.shortName,
      info: action.description,
    },
    invoke: ({services}, e) => action.invoke(services.sketcher.inPlaceEditor.sketcherAppContext)
  }
}
export const SKETCHER_MODE_HEADS_UP_ACTIONS = [
  ['sketchSaveAndExit', 'sketchExit'],
  '-',
  generalToolActions.map(a => toSketcherActionId(a.id)),
  '-',
  [
    ...objectToolActions.map(a => toSketcherActionId(a.id)),
    toSketcherActionId('Offset'),
  ],
  '-',
  measureActions.map(a => toSketcherActionId(a.id)),
  '-',
  constraintGlobalActions.map(a => toSketcherActionId(a.id)),
  '-',
  ['LookAtFace'],
  '-',
  ['sketchOpenInTab']
];

insertAfter(SKETCHER_MODE_HEADS_UP_ACTIONS, SKETCHER_PREFIX + 'Export', '-');
insertAfter(SKETCHER_MODE_HEADS_UP_ACTIONS, SKETCHER_PREFIX + 'PanTool', '-');
insertAfter(SKETCHER_MODE_HEADS_UP_ACTIONS, SKETCHER_PREFIX + 'BezierTool', '-');

