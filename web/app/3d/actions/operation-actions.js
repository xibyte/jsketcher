import * as Operations from '../operations'
import * as ActionHelpers from './action-helpers'

function mergeInfo(opName, action) {
  const op = Operations[opName];
  action.label = op.label;
  action.icon32 = op.icon + '32.png';
  action.icon96 = op.icon + '96.png';
  action.invoke = (app) => app.ui.initOperation(opName);
  return action;
}

export const OperationActions = {
  
  'CUT': mergeInfo('CUT', {
    info: 'makes a cut based on 2D sketch'
  }),
  
  'PAD': mergeInfo('PAD', {
    info: 'extrudes 2D sketch'
  }),

  'BOX': mergeInfo('BOX', {
    info: 'creates new object box'
  }),

  'PLANE': mergeInfo('PLANE', {
    info: 'creates new object plane'
  }),
  
  'SPHERE': mergeInfo('SPHERE', {
    info: 'creates new object sphere'
  }),

  'INTERSECTION': mergeInfo('INTERSECTION', {
    info: 'intersection operation on two solids'
  }),
  
  'DIFFERENCE': mergeInfo('DIFFERENCE', {
    info: 'difference operation on two solids'
  }),
  
  'UNION': mergeInfo('UNION', {
    info: 'union operation on two solids'
  })
};

requiresFaceSelection(OperationActions.CUT, 1);
requiresFaceSelection(OperationActions.PAD, 1);

requiresSolidSelection(OperationActions.INTERSECTION, 2);
requiresSolidSelection(OperationActions.DIFFERENCE, 2);
requiresSolidSelection(OperationActions.UNION, 2);

function requiresFaceSelection(action, amount) {
  action.listens = ['selection'];
  action.update = ActionHelpers.checkForSelectedFaces(amount)
}

function requiresSolidSelection(action, amount) {
  action.listens = ['selection'];
  action.update = ActionHelpers.checkForSelectedSolids(amount)
}
