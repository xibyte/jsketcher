
/** @constructor */
function HistoryManager(viewer) {
  this.viewer = viewer;
  // this.dmp = new diff_match_patch();
  this.init({});
  // this.init(this.viewer.io.serializeSketch());
}

HistoryManager.prototype.init = function(sketchData) {
  this.lastCheckpoint = sketchData;
  this.diffs = [];
  this.historyPointer = -1;
};

HistoryManager.prototype.undo = function () {
  const currentState = this.viewer.io.serializeSketch();
  if (currentState == this.lastCheckpoint) {
    if (this.historyPointer != -1) {
      const diff = this.diffs[this.historyPointer];
      this.lastCheckpoint = this.applyDiff(this.lastCheckpoint, diff);
      this.viewer.io.loadSketch(this.lastCheckpoint);
      this.viewer.fullHeavyUIRefresh();
      this.historyPointer --;
    }
  } else {
    const diffToCurr = this.getDiff(currentState, this.lastCheckpoint);
    if (this.historyPointer != this.diffs.length - 1) {
      this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1)
    }
    this.diffs.push(diffToCurr);
    this.viewer.io.loadSketch(this.lastCheckpoint);
    this.viewer.fullHeavyUIRefresh();
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
    // this._checkpoint();
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
  const diffToCurr = this.getDiff(currentState, this.lastCheckpoint);
  if (this.historyPointer != this.diffs.length - 1) {
    this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1)
  }
  this.diffs.push(diffToCurr);
  this.historyPointer = this.diffs.length - 1;
  this.lastCheckpoint = currentState;
};

HistoryManager.prototype.redo = function () {
  const currentState = this.viewer.io.serializeSketch();
  if (currentState != this.lastCheckpoint) {
    return;
  }
  if (this.historyPointer != this.diffs.length - 1 && this.diffs.length != 0) {
    this.historyPointer ++;
    const diff = this.diffs[this.historyPointer];
    this.lastCheckpoint = this.applyDiffInv(this.lastCheckpoint, diff);
    this.viewer.io.loadSketch(this.lastCheckpoint);
    this.viewer.fullHeavyUIRefresh();
  }
};

HistoryManager.prototype.applyDiff = function (text1, diff) {
  // var dmp = this.dmp;
  // var results = dmp.patch_apply(diff, text1);
  // return results[0];
};

HistoryManager.prototype.applyDiffInv = function (text1, diff) {
  this.reversePatch(diff);
  const result = this.applyDiff(text1, diff);
  this.reversePatch(diff);
  return result;
};

HistoryManager.prototype.reversePatch = function (plist) {
  for (let i = 0; i < plist.length; i++) {
    const patch = plist[i];
    for (let j = 0; j < patch.diffs.length; j++) {
      const diff = patch.diffs[j];
      diff[0] *= -1;
    }
  }
};

HistoryManager.prototype.getDiff = function (text1, text2) {
  // var dmp = this.dmp;
  // var diff = dmp.diff_main(text1, text2, true);
  //
  // if (diff.length > 2) {
  //   dmp.diff_cleanupSemantic(diff);
  // }
  //
  // var patch_list = dmp.patch_make(text1, text2, diff);
  // //var patch_text = dmp.patch_toText(patch_list);
  // //console.log(patch_list);
  // return patch_list;
};

export {HistoryManager}