import * as Operations from '../craft/operations'
import * as ActionHelpers from './action-helpers'

const OPERATION_ACTIONS = [
  {
    id: 'CUT',
    appearance: {
      info: 'makes a cut based on 2D sketch',
    },
    ...requiresFaceSelection(1)
  },
  {
    id: 'EXTRUDE',
    appearance: {
      info: 'extrudes 2D sketch',
    },
  },
  {
    id: 'REVOLVE',
    appearance: {
      info: 'revolve 2D sketch',
    },
    ...requiresFaceSelection(1)
  },
  {
    id: 'SHELL',
    appearance: {
      info: 'makes shell using borders',
    },
    ...requiresFaceSelection(1)
  },
  {
    id: 'BOX',
    appearance: {
      info: 'creates new object box'
    },
  },
  {
    id: 'PLANE',
    appearance: {
      info: 'creates new object plane'
    },
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
  action.invoke = app => app.ui.initOperation(action.id);
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