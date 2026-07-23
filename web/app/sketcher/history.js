
/** @constructor */
function HistoryManager(viewer) {
  this.viewer = viewer;
  this.dmp = new diff_match_patch();
  this.lastCheckpoint = '';
  this.diffs = [];
  this.historyPointer = -1;
  this._counter = 0;
}

HistoryManager.prototype.init = function(sketchData) {
  this.lastCheckpoint = typeof sketchData === 'string' ? sketchData : '';
  this.diffs = [];
  this.historyPointer = -1;
};

HistoryManager.prototype.undo = function () {
  const currentState = this.viewer.io.serializeSketch();
  if (currentState != this.lastCheckpoint) {
    // Unsaved change — checkpoint it first so we can redo to it
    this._checkpoint();
  }
  if (this.historyPointer >= 0) {
    const diff = this.diffs[this.historyPointer];
    const prevState = this.applyDiffInv(this.lastCheckpoint, diff);
    if (prevState && prevState.length > 2) {
      this.lastCheckpoint = prevState;
      this.viewer.io.loadSketch(this.lastCheckpoint);
      this.viewer.fullHeavyUIRefresh();
    }
    this.historyPointer--;
  }
};

HistoryManager.prototype.lightCheckpoint = function (weight) {
  this._counter += weight;
  if (this._counter >= 100) {
    this.checkpoint();
  }
};

HistoryManager.prototype.checkpoint = function () {
  try {
    this._checkpoint();
  } catch(e) {
    console.log(e);
  }
};

HistoryManager.prototype._checkpoint = function () {
  this._counter = 0;
  const currentState = this.viewer.io.serializeSketch();
  if (currentState == this.lastCheckpoint) {
    return;
  }
  // Forward diff: lastCheckpoint → currentState
  const diff = this.getDiff(this.lastCheckpoint, currentState);
  if (this.historyPointer != this.diffs.length - 1) {
    this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1);
  }
  this.diffs.push(diff);
  this.historyPointer = this.diffs.length - 1;
  this.lastCheckpoint = currentState;
};

HistoryManager.prototype.redo = function () {
  if (this.historyPointer < this.diffs.length - 1) {
    this.historyPointer++;
    const diff = this.diffs[this.historyPointer];
    this.lastCheckpoint = this.applyDiff(this.lastCheckpoint, diff);
    this.viewer.io.loadSketch(this.lastCheckpoint);
    this.viewer.fullHeavyUIRefresh();
  }
};

HistoryManager.prototype.applyDiff = function (text, diff) {
  var results = this.dmp.patch_apply(diff, text);
  return results[0];
};

HistoryManager.prototype.applyDiffInv = function (text, diff) {
  this.reversePatch(diff);
  const result = this.applyDiff(text, diff);
  this.reversePatch(diff);
  return result;
};

HistoryManager.prototype.reversePatch = function (plist) {
  for (let i = 0; i < plist.length; i++) {
    const patch = plist[i];
    for (let j = 0; j < patch.diffs.length; j++) {
      patch.diffs[j][0] *= -1;
    }
  }
};

HistoryManager.prototype.getDiff = function (text1, text2) {
  var dmp = this.dmp;
  var diff = dmp.diff_main(text1, text2, true);
  if (diff.length > 2) {
    dmp.diff_cleanupSemantic(diff);
  }
  return dmp.patch_make(text1, text2, diff);
};

export {HistoryManager}
