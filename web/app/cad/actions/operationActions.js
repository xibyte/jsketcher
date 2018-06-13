import * as Operations from '../craft/operations'
import * as ActionHelpers from './actionHelpers'

const OPERATION_ACTIONS = [
  {
    id: 'SHELL',
    appearance: {
      info: 'makes shell using borders',
    },
    ...requiresFaceSelection(1)
  },
  {
    id: 'SPHERE',
    appearance: {
      info: 'creates new object sphere'
    },
  },
  {
    id: 'INTERSECTION',
    appearance: {
      info: 'intersection operation on two solids',
    },
    ...requiresSolidSelection(2)
  },
  {
    id: 'DIFFERENCE',
    appearance: {
      info: 'difference operation on two solids',
    },
    ...requiresSolidSelection(2)
  },
  {
    id: 'UNION',
    appearance: {
      info: 'union operation on two solids',
    },
    ...requiresSolidSelection(2)
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
    listens: ['selection_face'],
    update: ActionHelpers.checkForSelectedFaces(amount)
  }
}

function requiresSolidSelection(amount) {
  return {
    listens: ['selection_face'],
    update: ActionHelpers.checkForSelectedSolids(amount)
  }
}

export default OPERATION_ACTIONS;