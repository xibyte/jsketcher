import * as Operations from '../operations'

function mergeInfo(op, action) {
  action.label = op.label;
  action.icon32 = op.icon + '32.png';
  action.icon96 = op.icon + '96.png';
  return action;
}

export const OperationActions = {
  
  'CUT': mergeInfo(Operations.CUT, {
    info: 'makes a cut based on 2D sketch'
  }),
  
  'PAD': mergeInfo(Operations.PAD, {
    info: 'extrudes 2D sketch'
  }),

  'BOX': mergeInfo(Operations.BOX, {
    info: 'creates new object box'
  }),

  'PLANE': mergeInfo(Operations.PLANE, {
    info: 'creates new object plane'
  }),
  
  'SPHERE': mergeInfo(Operations.SPHERE, {
    info: 'creates new object sphere'
  }),

  'INTERSECTION': mergeInfo(Operations.INTERSECTION, {
    info: 'intersection operation on two solids'
  }),
  
  'DIFFERENCE': mergeInfo(Operations.DIFFERENCE, {
    info: 'difference operation on two solids'
  }),
  
  'UNION': mergeInfo(Operations.UNION, {
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
  action.update = (state, app) => {
    state.enabled = app.viewer.selectionMgr.selection.length >= amount;
    if (!state.enabled) {
      state.hint = 'requires at least one face to be selected';
    } 
  }
}

function requiresSolidSelection(action, amount) {
  action.listens = ['selection'];
  action.update = (state, app) => {
    state.enabled = app.viewer.selectionMgr.selection.length >= amount;
    if (!state.enabled) {
      state.hint = 'requires at least two solids to be selected';
    }
  }
}
