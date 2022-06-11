
export async function createPlaneAndOpenSketcher(ui) {
  ui.openWizard('PLANE');
  await ui.wizardOK();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  let sketchedFace = ui.context.services.selection.face.single;
  let sketcher = ui.openSketcher();
  return [sketcher, sketchedFace];
}

export async function extrudeCube(ui) {
  let [sketcherUI, sketchedFace] = await createPlaneAndOpenSketcher(ui);
  sketcherUI.addRectangle(-100, -100, 100, 100);
  ui.commitSketch();
  ui.selectFaces([0, 0, -10], [0, 0, 10]);
  ui.openWizard('EXTRUDE');
  ui.wizardContext.updateParam('length', 200);
  await ui.wizardOK();
}

