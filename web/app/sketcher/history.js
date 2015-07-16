TCAD.HistoryManager = function(viewer) {
  this.viewer = viewer;
  this.dmp = new diff_match_patch();
  this.historyPointer = -1;
  this.diffs = [];
  this._counter = 0;
};


TCAD.HistoryManager.prototype.init = function(sketchData) {
  this.lastCheckpoint = sketchData;
  this.diffs = [];
  this.historyPointer = -1;
};

TCAD.HistoryManager.prototype.undo = function () {
  var currentState = this.viewer.io.serializeSketch();
  if (currentState == this.lastCheckpoint) {
    if (this.historyPointer != -1) {
      var diff = this.diffs[this.historyPointer];
      this.lastCheckpoint = this.applyDiff(this.lastCheckpoint, diff);
      this.viewer.io.loadSketch(this.lastCheckpoint);
      this.viewer.fullHeavyUIRefresh();
      this.historyPointer --;
    }
  } else {
    var diffToCurr = this.getDiff(currentState, this.lastCheckpoint);
    if (this.historyPointer != this.diffs.length - 1) {
      this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1)
    }
    this.diffs.push(diffToCurr);
    this.viewer.io.loadSketch(this.lastCheckpoint);
    this.viewer.fullHeavyUIRefresh();
  }
};

TCAD.HistoryManager.prototype.lightCheckpoint = function (weight) {
  this._counter += weight;
  if (this._counter >= 100) {
    this.checkpoint();
  }
};

TCAD.HistoryManager.prototype.checkpoint = function () {
  try {
    this._checkpoint();
  } catch(e) {
    console.log(e);
  }
};

TCAD.HistoryManager.prototype._checkpoint = function () {
  this._counter = 0;
  var currentState = this.viewer.io.serializeSketch();
  if (currentState == this.lastCheckpoint) {
    return;
  }
  var diffToCurr = this.getDiff(currentState, this.lastCheckpoint);
  if (this.historyPointer != this.diffs.length - 1) {
    this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1)
  }
  this.diffs.push(diffToCurr);
  this.historyPointer = this.diffs.length - 1;
  this.lastCheckpoint = currentState;
};

TCAD.HistoryManager.prototype.redo = function () {
  var currentState = this.viewer.io.serializeSketch();
  if (currentState != this.lastCheckpoint) {
    return;
  }
  if (this.historyPointer != this.diffs.length - 1 && this.diffs.length != 0) {
    this.historyPointer ++;
    var diff = this.diffs[this.historyPointer];
    this.lastCheckpoint = this.applyDiffInv(this.lastCheckpoint, diff);
    this.viewer.io.loadSketch(this.lastCheckpoint);
    this.viewer.fullHeavyUIRefresh();
  }
};

TCAD.HistoryManager.prototype.applyDiff = function (text1, diff) {
  var dmp = this.dmp;
  var results = dmp.patch_apply(diff, text1);
  return results[0];
};

TCAD.HistoryManager.prototype.applyDiffInv = function (text1, diff) {
  this.reversePatch(diff);
  var result = this.applyDiff(text1, diff);
  this.reversePatch(diff);
  return result;
};

TCAD.HistoryManager.prototype.reversePatch = function (plist) {
  for (var i = 0; i < plist.length; i++) {
    var patch = plist[i];
    for (var j = 0; j < patch.diffs.length; j++) {
      var diff = patch.diffs[j];
      diff[0] *= -1;
    }
  }
};

TCAD.HistoryManager.prototype.getDiff = function (text1, text2) {
  var dmp = this.dmp;
  var diff = dmp.diff_main(text1, text2, true);

  if (diff.length > 2) {
    dmp.diff_cleanupSemantic(diff);
  }

  var patch_list = dmp.patch_make(text1, text2, diff);
  //var patch_text = dmp.patch_toText(patch_list);
  //console.log(patch_list);
  return patch_list;
};
