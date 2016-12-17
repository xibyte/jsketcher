import * as ActionHelpers from './action-helpers'

export const EditFace = {
  cssIcons: ['file-picture-o'],
  label: 'edit sketch',
  icon96: 'img/3d/face-edit96.png',
  info: 'open sketcher for a face/plane',
  listens: ['selection'],
  update: ActionHelpers.checkForSelectedFaces(1),
  invoke: (app) => app.sketchFace()
};

export const Save = {
  cssIcons: ['floppy-o'],
  label: 'save',
  info: 'save project to storage',
  invoke: (app) => app.save()
};

export const StlExport = {
  cssIcons: ['upload', 'flip-vertical'],
  label: 'STL Export',
  info: 'export model to STL file',
  invoke: (app) => app.stlExport()
};

export const RefreshSketches = {
  cssIcons: ['refresh'],
  label: 'Refresh Sketches',
  info: 'refresh all visible sketches',
  invoke: (app) => app.refreshSketches()
};

export const DeselectAll = {
  cssIcons: ['square-o'],
  label: 'deselect all',
  info: 'deselect everything',
  invoke: (app) => app.viewer.selectionMgr.deselectAll()
};

export const Info = {
  cssIcons: ['info-circle'],
  label: 'info',
  info: 'opens help dialog',
  invoke: (app) => app.showInfo()
};

export const ShowSketches = {
  type: 'binary',
  property: 'showSketches',
  cssIcons: ['image'],
  label: 'show sketches',
  info: 'toggle whether to show sketches on a solid face'
};

export const LookAtSolid = {
  cssIcons: ['crosshairs'],
  label: 'look at solid',
  info: 'position camera at the solid at zoom to fit it',
  invoke: (app, e) => app.lookAtSolid(app.inputManager.context.attr('data-id'))
};


export const noIcon = {
  label: 'no icon'
};