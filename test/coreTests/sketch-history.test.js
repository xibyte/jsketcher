// Regression coverage for the sketch history in https://github.com/xibyte/jsketcher/pull/220.
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {HistoryManager} from '../../web/app/sketcher/history';
runInThisContext(readFileSync('web/lib/diff_match_patch.js', 'utf8'));
globalThis.window = globalThis;
let model = JSON.stringify({objects: []});
const viewer = {io: {serializeSketch: () => model, loadSketch: value => { JSON.parse(value); model = value; }}, fullHeavyUIRefresh() {}};
const history = new HistoryManager(viewer);
history.init(model);
const states = [model];
for (let i = 0; i < 20; i++) {
  model = JSON.stringify({objects: Array.from({length: i + 1}, (_, j) => ({id: j, data: 'x'.repeat((i * 13 + j * 7) % 73)}))});
  states.push(model);
  history.checkpoint();
}
for (let i = states.length - 2; i >= 0; i--) { history.undo(); assert.equal(model, states[i]); }
for (let i = 1; i < states.length; i++) { history.redo(); assert.equal(model, states[i]); }
history.undo();
const newEdit = JSON.stringify({objects: ['new edit']});
model = newEdit;
history.redo();
assert.equal(model, newEdit, 'redo must not overwrite an edit made after undo');
history.checkpoint();
history.redo();
assert.equal(model, newEdit, 'new edits discard the old redo branch');
const pointer = history.historyPointer, saved = history.lastCheckpoint;
const realApply = history.dmp.patch_apply;
history.dmp.patch_apply = () => ['bad patch', [false]];
assert.throws(() => history.undo(), /could not be applied/);
assert.equal(history.historyPointer, pointer);
assert.equal(history.lastCheckpoint, saved);
assert.equal(model, newEdit);
history.dmp.patch_apply = realApply;
history.undo();
assert.equal(model, states[states.length - 2]);
const boundedStates = [model];
for (let i = 0; i < 120; i++) {
  model = JSON.stringify({objects: ['bounded', i]});
  boundedStates.push(model);
  history.checkpoint();
}
assert.equal(history.diffs.length, 100);
for (let i = 0; i < 100; i++) history.undo();
assert.equal(model, boundedStates[20]);
history.undo();
assert.equal(model, boundedStates[20], 'pruned history has a stable boundary');
// Failed or incomplete reconstruction must restore the exact pre-undo sketch.
model = JSON.stringify({objects: ['before restore failure']});
history.checkpoint();
const preUndo = model, prePointer = history.historyPointer;
const actualLoad = viewer.io.loadSketch;
let attempts = 0;
viewer.io.loadSketch = value => { attempts++; if (attempts === 1) { model = JSON.stringify({objects: ['partial']}); return; } actualLoad(value); };
assert.throws(() => history.undo(), /previous sketch was restored/);
assert.equal(model, preUndo);
assert.equal(history.historyPointer, prePointer);
viewer.io.loadSketch = () => { model = JSON.stringify({objects: ['partial']}); throw new Error('injected failure'); };
assert.throws(() => history.undo(), /rollback failed/);
assert.equal(history.recoverySnapshot, preUndo);
assert.throws(() => history.redo(), /recovery is required/);
viewer.io.loadSketch = actualLoad;
assert.equal(history.recover(), true);
assert.equal(model, preUndo);
assert.equal(history.recoverySnapshot, null);
console.log('PASS sketch undo, redo, branching, bounded history, failed reconstruction and recovery');
