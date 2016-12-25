export const SetHistoryPointer = {
  label: 'set history',
  info: 'set history pointer to this modification item',
  invoke: (app) => {
    const mIndex = parseInt(modificationIndex(app));
    app.craft.historyPointer = mIndex;
  }
};

export const OpenHistoryWizard = {
  label: 'edit operation',
  info: 'open wizard to change parameters of this operation',
  invoke: (app) => {
    const mIndex = parseInt(modificationIndex(app));
    if (mIndex != app.craft.historyPointer) {
      app.craft.historyPointer = mIndex;
    } else {
      const modification = app.craft.history[mIndex];
      app.ui.createWizardForOperation(modification);  
    }
  }
};

export const EditOperationSketch = {
  cssIcons: ['image'],
  label: 'sketch',
  info: 'edit the sketch assigned to this operation',
  invoke: (app) => {

    const mIndex = parseInt(modificationIndex(app));
    const modification = app.craft.history[mIndex];
    if (!modification.face) {
      return;
    }
    if (mIndex != app.craft.historyPointer) {
      app.craft.historyPointer = mIndex;
    }
    const face = app.findFace(modification.face);
    app.sketchFace(face);
  }
};

export const RemoveModification = {
  label: 'remove modification',
  info: 'remove this modification',
  invoke: (app) => {
    if (!confirm("This modification and all following modifications will be removed. Continue?")) {
      return;
    }
    const mIndex = parseInt(modificationIndex(app));
    app.craft.remove(mIndex);
  }
};

function modificationIndex(app) {
  return app.inputManager.context.data('modification')
}