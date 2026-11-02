import {DxfParserAdapter} from './dxf';

// Import into an already-open sketch. All storage and file selection are owned
// by the embedding desktop. expected is captured before the file picker opens.
export async function importDxfSketch(viewer, text, expected, stillActive = () => true) {
  if (!stillActive() || !viewer || !viewer.historyManager || viewer.historyManager.recoverySnapshot) throw new Error('The sketch is not ready for import.');
  if (viewer.toolManager.tool !== viewer.toolManager.defaultTool) throw new Error('Finish or cancel the current drawing tool before importing.');
  if (viewer.io.serializeSketch(undefined, {strict: true}) !== expected) throw new Error('The sketch changed while choosing a file. Try again.');
  let parsed;
  try { parsed = await new DxfParserAdapter().parse(text); }
  catch (error) { throw new Error(error instanceof Error ? error.message : String(error)); }
  if (!stillActive() || viewer.toolManager.tool !== viewer.toolManager.defaultTool || viewer.io.serializeSketch(undefined, {strict: true}) !== expected) throw new Error('The sketch changed while importing. Try again.');
  if (!parsed.objects.length) throw new Error('No supported shapes were found in this DXF file.');
  const result = JSON.parse(expected);
  const stage = viewer.parametricManager.getStageIndex(viewer.parametricManager.stage);
  if (!Number.isInteger(stage) || stage < 0 || stage >= result.stages.length) throw new Error('The current sketch stage is unavailable.');
  const prefix = 'dxf-' + crypto.randomUUID() + '-';
  parsed.objects.forEach((obj, i) => result.objects.push({...obj, id: prefix + i, stage}));
  const history = viewer.historyManager;
  history._checkpoint();
  const checkpoint = {diffs: history.diffs.slice(), pointer: history.historyPointer, last: history.lastCheckpoint, counter: history._counter};
  try {
    history.restoreChecked(JSON.stringify(result));
    history._checkpoint();
    viewer.fullHeavyUIRefresh();
  } catch (error) {
    // restoreChecked handles its own reconstruction failure. If checkpointing
    // or refresh failed afterward, restore the original sketch as well.
    if (!history.recoverySnapshot && viewer.io.serializeSketch(undefined, {strict: true}) !== expected) {
      history.restoreChecked(expected);
    }
    if (!history.recoverySnapshot) {
      history.diffs = checkpoint.diffs;
      history.historyPointer = checkpoint.pointer;
      history.lastCheckpoint = checkpoint.last;
      history._counter = checkpoint.counter;
    }
    throw error;
  }
}
