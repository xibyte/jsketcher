
/** @constructor */
function HistoryManager(viewer) {
  this.viewer = viewer;
  this.dmp = new window.diff_match_patch();
  this.lastCheckpoint = '';
  this.diffs = [];
  this.historyPointer = -1;
  this._counter = 0;
  this.recoverySnapshot = null;
}

HistoryManager.prototype.init = function(sketchData) {
  this.lastCheckpoint = typeof sketchData === 'string' ? sketchData : '';
  this.diffs = [];
  this.historyPointer = -1;
  this.recoverySnapshot = null;
};

HistoryManager.prototype.undo = function () {
  if (this.recoverySnapshot) throw new Error('Sketch recovery is required before undo.');
  const currentState = this.viewer.io.serializeSketch(undefined, {strict: true});
  if (currentState != this.lastCheckpoint) {
    // Unsaved change — checkpoint it first so we can redo to it
    this._checkpoint();
  }
  if (this.historyPointer >= 0) {
    const diff = this.diffs[this.historyPointer];
    const prevState = this.applyDiff(this.lastCheckpoint, diff.reverse);
    if (prevState && prevState.length > 2) {
      this.restoreChecked(prevState);
      this.lastCheckpoint = prevState;
      this.historyPointer--;
      this.viewer.fullHeavyUIRefresh();
    }
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
  if (this.recoverySnapshot) throw new Error('Sketch recovery is required before updating history.');
  this._counter = 0;
  const currentState = this.viewer.io.serializeSketch(undefined, {strict: true});
  if (currentState == this.lastCheckpoint) {
    return;
  }
  // Build both directions against their exact input, including patch offsets.
  const diff = {
    forward: this.getDiff(this.lastCheckpoint, currentState),
    reverse: this.getDiff(currentState, this.lastCheckpoint)
  };
  if (this.historyPointer != this.diffs.length - 1) {
    this.diffs.splice(this.historyPointer + 1, this.diffs.length - this.historyPointer + 1);
  }
  this.diffs.push(diff);
  // Bound the number of snapshots; individual sketches may still be large.
  if (this.diffs.length > 100) this.diffs.shift();
  this.historyPointer = this.diffs.length - 1;
  this.lastCheckpoint = currentState;
};

HistoryManager.prototype.redo = function () {
  if (this.recoverySnapshot) throw new Error('Sketch recovery is required before redo.');
  // An edit made after undo must not be silently replaced by the old future.
  if (this.viewer.io.serializeSketch(undefined, {strict: true}) !== this.lastCheckpoint) return;
  if (this.historyPointer < this.diffs.length - 1) {
    const nextPointer = this.historyPointer + 1;
    const nextState = this.applyDiff(this.lastCheckpoint, this.diffs[nextPointer].forward);
    this.restoreChecked(nextState);
    this.lastCheckpoint = nextState;
    this.historyPointer = nextPointer;
    this.viewer.fullHeavyUIRefresh();
  }
};

// Compare serialized JSON without depending on object-key order. Arrays retain
// their order because stage and object ordering can affect a sketch.
function canonicalSketch(text) {
  function sort(value) {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
    }
    return value;
  }
  return JSON.stringify(sort(JSON.parse(text)));
}

HistoryManager.prototype.restoreChecked = function (target) {
  const before = this.viewer.io.serializeSketch(undefined, {strict: true});
  const load = text => {
    this.viewer.io.loadSketch(text, {strict: true});
    if (canonicalSketch(this.viewer.io.serializeSketch(undefined, {strict: true})) !== canonicalSketch(text)) {
      throw new Error('The reconstructed sketch does not match its saved state.');
    }
  };
  try { load(target); }
  catch (error) {
    try { load(before); }
    catch (rollbackError) {
      this.recoverySnapshot = before;
      throw new Error('Sketch reconstruction and rollback failed. The previous sketch is held in memory; do not save this partial sketch.');
    }
    throw new Error('Sketch reconstruction failed; the previous sketch was restored.');
  }
};

HistoryManager.prototype.recover = function () {
  if (!this.recoverySnapshot) return false;
  const saved = this.recoverySnapshot;
  this.viewer.io.loadSketch(saved, {strict: true});
  if (canonicalSketch(this.viewer.io.serializeSketch(undefined, {strict: true})) !== canonicalSketch(saved)) {
    throw new Error('Recovery did not restore the complete sketch. The earlier snapshot remains in memory.');
  }
  this.recoverySnapshot = null;
  this.viewer.fullHeavyUIRefresh();
  return true;
};

HistoryManager.prototype.applyDiff = function (text, diff) {
  const results = this.dmp.patch_apply(diff, text);
  if (!results[1].every(Boolean)) throw new Error('Sketch history patch could not be applied.');
  return results[0];
};

HistoryManager.prototype.getDiff = function (text1, text2) {
  const dmp = this.dmp;
  const diff = dmp.diff_main(text1, text2, true);
  if (diff.length > 2) {
    dmp.diff_cleanupSemantic(diff);
  }
  return dmp.patch_make(text1, text2, diff);
};

export {HistoryManager}
