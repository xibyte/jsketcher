import Counters from '../counters'

export function Craft(app) {
  this.app = app;
  this.history = [];
  this.solids = [];
  this._historyPointer = 0;
  Object.defineProperty(this, "historyPointer", {
    get: function() {return this._historyPointer},
    set: function(value) {
      if (this._historyPointer === value) return;
      this._historyPointer = value;
      this.reset(this.history.slice(0, this._historyPointer));
      this.app.bus.notify('craft');
      this.app.bus.notify('historyPointer');
      this.app.viewer.render();
    }
  });
}

Craft.prototype.remove = function(modificationIndex) {
  const history = this.history;
  history.splice(modificationIndex, history.length - modificationIndex);

  if (this.historyPointer >= history.length) {
    this.finishHistoryEditing();
  } else {
    this.app.bus.notify('historyShrink');
  }
};

Craft.prototype.loadHistory = function(history) {
  this.history = history;
  this._historyPointer = history.length;
  this.reset(history);
  this.app.bus.notify('craft');
  this.app.bus.notify('historyPointer');
  this.app.viewer.render();
};

Craft.prototype.reset = function(modifications) {
  Counters.solid = 0;
  Counters.shared = 0;
  this.solids = [];
  this.app.findAllSolids().forEach(function(s) {s.vanish()});
  for (var i = 0; i < modifications.length; i++) {
    const request = modifications[i];
    this.modifyInternal(request);
  }
};

Craft.prototype.finishHistoryEditing = function() {
  this.loadHistory(this.history);
};

Craft.prototype.current = function() {
  return this.history[this.history.length - 1];
};


Craft.prototype.modifyInternal = function(request) {
  var op = this.operations[request.type];
  if (!op) return;

  var newSolids = op(this.app, request.params);
  if (newSolids == null) return;
  const toUpdate = [];
  for (let i = 0; i < request.solids.length; i++) {
    let solid = request.solids[i];
    var indexToRemove = this.solids.indexOf(solid);
    if (indexToRemove != -1) {
      let updatedIdx = newSolids.findIndex((s) => s.id == solid.id);
      if (updatedIdx != -1) {
        toUpdate[updatedIdx] = indexToRemove;
      } else {
        this.solids.splice(indexToRemove, 1);
      }
    }
    solid.vanish();
  }
  for (let i = 0; i < newSolids.length; i++) {
    let solid = newSolids[i];
    if (toUpdate[i] !== undefined) {
      this.solids[toUpdate[i]] = solid;
    } else {
      this.solids.push(solid);
    }
    this.app.viewer.workGroup.add(solid.cadGroup);
  }
  this.app.bus.notify('solid-list', {
    solids: this.solids,
    needRefresh: newSolids
  });
};

Craft.prototype.modify = function(request, overriding) {
  this.modifyInternal(request);
  if (!overriding && this._historyPointer != this.history.length) {
    this.history.splice(this._historyPointer + 1, 0, null);
  }
  this.history[this._historyPointer] = request;
  this._historyPointer ++;
  this.app.bus.notify('craft');
  this.app.bus.notify('historyPointer');
  this.app.viewer.render();
};