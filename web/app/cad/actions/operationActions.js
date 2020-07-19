import * as Operations from '../craft/operations';
import * as ActionHelpers from './actionHelpers';

// L E G A C Y
const OPERATION_ACTIONS = [
  {
    id: 'SHELL',
    appearance: {
      info: 'makes shell using borders',
    },
    ...requiresFaceSelection(1)
  },
  {
    id: 'IMPORT_STL',
    appearance: {
      info: 'import stl from external location'
    }
  }
];

function mergeInfo(action) {
  const op = Operations[action.id];
  action.invoke = ({services}) => services.operation.startOperation(action.id);
  Object.assign(action.appearance, {
    label: op.label,
    icon32: op.icon + '32.png',
    icon96: op.icon + '96.png',
  });
}

OPERATION_ACTIONS.forEach(action => mergeInfo(action));

function requiresFaceSelection(amount) {
  return {
    listens: ctx => ctx.streams.selection.face,
    update: ActionHelpers.checkForSelectedFaces(amount)
  }
}

function requiresSolidSelection(amount) {
  return {
    listens: ctx => ctx.streams.selection.face,
    update: ActionHelpers.checkForSelectedSolids(amount)
  }
}

export default OPERATION_ACTIONS;