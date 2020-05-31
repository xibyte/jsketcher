
export async function createPlaneAndOpenSketcher(ui) {
  ui.openWizard('PLANE');
  await ui.wizardOK();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  return ui.openSketcher();
}

export async function extrudeCube(ui) {
  let sketcherUI = await createPlaneAndOpenSketcher(ui);
  sketcherUI.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('value', 200);
  await ui.wizardOK();
}

