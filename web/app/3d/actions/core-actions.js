export const refreshSketches = {
  cssIcons: ['refresh'],
  label: 'Refresh Sketches',
  info: 'refresh all visible sketches',
  invoke: (app) => app.refreshSketches()
};

export const info = {
  cssIcons: ['info-circle'],
  label: 'info',
  info: 'opens help dialog',
  invoke: (app) => app.showInfo()
};

export const showSketches = {
  type: 'binary',
  property: 'showSketches',
  cssIcons: ['image'],
  label: 'show sketches',
  info: 'toggle whether show sketches on a solid face'
};

export const noIcon = {
  label: 'no icon'
};