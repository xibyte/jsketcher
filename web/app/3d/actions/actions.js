
export function ActionManager(app) {
  this.app = app;
  this.actions = {};
  this.eventsToActions = {};
  this.registerAction('-', {'type': 'separator'});
}

ActionManager.prototype.registerAction = function(id, action) {
  action = Object.assign({id: id}, action);
  action.__handler = handler(action);
  action.state = {
    hint: '',
    enabled: true,
    visible: true
  };
  this.addListeners(action);
  this.actions[id] = action;
};

ActionManager.prototype.addListeners = function(action) {
  if (action.listens == undefined || action.update == undefined) return;
  for (let event of action.listens) {
    let actions = this.eventsToActions[event];
    if (actions == undefined) {
      actions = [];
      this.eventsToActions[event] = actions;
      this.app.bus.subscribe(event, (data) => this.notify(event));
    }
    actions.push(action);
  }
  this.updateAction(action);
};

ActionManager.prototype.notify = function(event) {
  let actions = this.eventsToActions[event];
  if (actions != undefined) {
    for (let action of actions) {
      this.updateAction(action);
      this.app.bus.notify('action.update.' + action.id, action.state);
    }
  }  
};

ActionManager.prototype.updateAction = function(action) {
  action.state.hint = '';
  action.state.enabled = true;
  action.state.visible = true;
  action.update(action.state, this.app);
};

ActionManager.prototype.registerActions = function(actions) {
  for (let actionName in actions) {
    this.registerAction(actionName, actions[actionName]);
  }
};

ActionManager.prototype.run = function(actionId, event) {
  var action = this.actions[actionId];
  if (action == undefined) {
    return;
  }
  if (action.state.enabled) {
    action.__handler(this.app, event);
  } else {
    this.app.inputManager.messageSink.info("action '"+actionId+"' is disabled and can't be executed<br>" + action.state.hint);
  }
};

ActionManager.prototype.subscribe = function(actionId, callback) {
  this.app.bus.subscribe('action.update.'+actionId, callback);
  const action = this.actions[actionId];
  if (action) {
    callback(action.state);
  }
  return callback;
};

const NOOP = () => {};

function handler(action) {
  if (action.type == 'binary') {
    return (app, event, source) => app.state[action.property] = !app.state[action.property];
  } else if (action.type == 'separator') {
    return NOOP;
  } else if (action.type == 'menu') {
    return (app, event) => action.menu.show(app, event);
  } else if (action.invoke != undefined) {
    return (app, event) => action.invoke(app, event);
  } else {
    return NOOP;
  }
}

