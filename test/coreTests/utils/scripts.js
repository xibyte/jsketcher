
export function createPlaneAndOpenSketcher(ui) {
  ui.openWizard('PLANE');
  ui.wizardOK();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  return ui.openSketcher();
}

export function extrudeCube(ui) {
  let sketcherUI = createPlaneAndOpenSketcher(ui);
  sketcherUI.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 200);
  ui.wizardOK();
}

