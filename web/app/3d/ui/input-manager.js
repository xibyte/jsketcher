import {jwerty} from 'jwerty'
import {keymap} from './keymaps/default'
import {Bind} from './bind'
import {MessageSink} from './message-sink'
import {LoadTemplate, DefaultMouseEvent, EventData, fit} from './utils'

export function InputManager(app) {
  this.app = app;
  this.openMenus = [];
  this.menuContext = null;
  this.keymap = keymap;
  this.mouseInfo = new DefaultMouseEvent();
  this.requestedActionInfo = null;
  this.actionInfoDom = $(LoadTemplate('action-info')({}));
  this.messageSink = new MessageSink(this);
  $(() => {
    $(document)
      .on('keydown', (e) => this.handleKeyPress(e))
      .on('mousedown', (e) => this.clear(e))
      .on('mouseenter', '.action-item', (e) => this.showActionInfo($(e.currentTarget)))
      .on('mouseleave', '.action-item', (e) => this.hideActionInfo())
      .on('mousemove', (e) => this.mouseInfo = e)
      .on('click', '.action-item', (e) => this.handleActionClick(e))
      .on('contextmenu', '.action-item', (e) => {return this.handleRightClick(e)});
  });
}

InputManager.prototype.handleKeyPress = function(e) {
  switch (e.keyCode) {
    case 27 : this.clear(); break;
  }

  for (let action in this.keymap) {
    if (jwerty.is(this.keymap[action], e)) {
      setTimeout(() => this.app.actionManager.run(action, e), 0);
      break;
    }
  }
};

InputManager.prototype.clear = function(e) {
  if (e != undefined && $(e.target).closest('.menu-item').length != 0) {
    return;
  }
  this.clearMenus();
  this.requestedActionInfo = null;
  this.messageSink.hide();
};

InputManager.prototype.clearMenus = function() {
  this.menuContext = null;
  if (this.openMenus.length != 0) {
    for (let openMenu of this.openMenus) {
      openMenu.node.hide();
    }
    this.openMenus = [];
  }
};

InputManager.prototype.handleRightClick = function(e) {
  if ($(event.currentTarget).hasClass('.right-click-action')) {
    e.preventDefault();
    this.handleActionClick(e);
    return false;
  }
  return true;
};

InputManager.prototype.handleActionClick = function(event) {
  var target = $(event.currentTarget);
  var action = target.data('action');
  if (action != undefined) {
    this.clear();
    EventData.set(event, 'initiator', this.menuContext ? this.menuContext : target);
    this.app.actionManager.run(action, event);
  }
};

InputManager.prototype.registerOpenMenu = function(menu, button) {
  fit(menu.node, $('body'));
  this.openMenus.push(menu);
  if (this.menuContext == null) {
    this.menuContext = button;
  }
};

InputManager.prototype.hideActionInfo = function() {
  this.requestedActionInfo = null;
  this.messageSink.hide();
};

InputManager.prototype.showActionInfo = function(el) {
  var action = el.data('action');
  if (action) {
    this.requestInfo(action);
  }
};

InputManager.prototype.requestInfo = function(actionRequest) {
  if (this.requestedActionInfo == actionRequest) {
    return;
  }
  this.requestedActionInfo = actionRequest;
  setTimeout(() => {
    const actionId = this.requestedActionInfo;
    this.requestedActionInfo = null;
    if (actionId != null ) {
      const action = this.app.actionManager.actions[actionId];
      const hotKey = this.keymap[actionId];
      if (action && (action.state.hint || action.info || hotKey)) {
        Bind(this.actionInfoDom, {
          hint: action.state.hint,
          info: action.info,
          hotKey: hotKey
        });
        this.messageSink.showContent(this.actionInfoDom);
      }
    }
  }, 500);
};