import Counters from '../counters'

export function Craft(app) {
  this.app = app;
  this.operations = {};
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

Craft.prototype.registerOperation = function(name, action) {
  this.operations[name] = action;
};

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
  this.solids.forEach(function(s) {s.vanish()});
  this.solids = [];
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

  const result = op(this.app, request.params);

  for (let solid of result.outdated) {
    solid.vanish();
    const idx = this.solids.indexOf(solid);
    if (idx != -1) {
      this.solids.splice(idx, 1);
    }
  }

  for (let solid of result.created) {
    this.solids.push(solid);
    this.app.viewer.workGroup.add(solid.cadGroup);
  }

  this.app.bus.notify('solid-list', {
    solids: this.solids,
    needRefresh: result.created
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