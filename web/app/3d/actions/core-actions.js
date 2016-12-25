import * as ActionHelpers from './action-helpers'

export const EditFace = {
  cssIcons: ['file-picture-o'],
  label: 'sketch',
  icon96: 'img/3d/face-edit96.png',
  info: 'open sketcher for a face/plane',
  listens: ['selection'],
  update: ActionHelpers.checkForSelectedFaces(1),
  invoke: (app) => app.sketchSelectedFace()
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

export const Donate = {
  cssIcons: ['paypal'],
  label: 'donate',
  info: 'open paypal donate page',
  invoke: (app, e) => window.open('https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=WADW7V7CC32CY&lc=US&item_name=web%2dcad%2eorg&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHosted', '_blank')
};

export const GitHub = {
  cssIcons: ['github'],
  label: 'GitHub',
  info: 'open GitHub project page',
  invoke: (app, e) => window.open('https://github.com/xibyte/jsketcher', '_blank')
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