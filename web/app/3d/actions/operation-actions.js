import * as Operations from '../craft/operations'
import * as ActionHelpers from './action-helpers'

function mergeInfo(opName, action) {
  const op = Operations[opName];
  action.label = op.label;
  action.icon32 = op.icon + '32.png';
  action.icon96 = op.icon + '96.png';
  action.invoke = (app) => app.ui.initOperation(opName);
  return action;
}

export const CUT = mergeInfo('CUT', {
  info: 'makes a cut based on 2D sketch'
});

export const EXTRUDE = mergeInfo('EXTRUDE', {
  info: 'extrudes 2D sketch'
});

export const REVOLVE = mergeInfo('REVOLVE', {
  info: 'revolve 2D sketch'
});

export const SHELL = mergeInfo('SHELL', {
  info: 'makes shell using borders'
});

export const BOX = mergeInfo('BOX', {
  info: 'creates new object box'
});

export const PLANE = mergeInfo('PLANE', {
  info: 'creates new object plane'
});

export const SPHERE = mergeInfo('SPHERE', {
  info: 'creates new object sphere'
});

export const INTERSECTION = mergeInfo('INTERSECTION', {
  info: 'intersection operation on two solids'
});

export const DIFFERENCE = mergeInfo('DIFFERENCE', {
  info: 'difference operation on two solids'
});

export const UNION = mergeInfo('UNION', {
  info: 'union operation on two solids'
});

export const IMPORT_STL = mergeInfo('IMPORT_STL', {
  info: 'import stl from external location'
});

requiresFaceSelection(CUT, 1);
requiresFaceSelection(EXTRUDE, 1);
requiresFaceSelection(REVOLVE, 1);

requiresSolidSelection(INTERSECTION, 2);
requiresSolidSelection(DIFFERENCE, 2);
requiresSolidSelection(UNION, 2);

function requiresFaceSelection(action, amount) {
  action.listens = ['selection'];
  action.update = ActionHelpers.checkForSelectedFaces(amount)
}

function requiresSolidSelection(action, amount) {
  action.listens = ['selection'];
  action.update = ActionHelpers.checkForSelectedSolids(amount)
}
