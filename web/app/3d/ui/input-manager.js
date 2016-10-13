import {jwerty} from 'jwerty'
import {keymap} from './keymaps/default'
import {DefaultMouseEvent, EventData, fit} from './utils'

export function InputManager(app) {
  this.app = app;
  this.openMenus = [];
  this.keymap = keymap;
  this.mouseInfo = new DefaultMouseEvent();
  this.requestedActionInfo = null;
  $(() => {
    $(document)
      .on('keydown', (e) => this.handleKeyPress(e))
      .on('mousedown', (e) => this.clear(e))
      .on('mouseenter', '.action-item', (e) => this.showActionInfo($(e.target)))
      .on('mouseleave', '.action-item', (e) => this.emptyInfo())
      .on('mousemove', (e) => this.mouseInfo = e)
      .on('click', '.action-item', (e) => this.handleActionClick(e));
  });
}

InputManager.prototype.handleKeyPress = function(e) {
  console.log(e.keyCode);
  switch (e.keyCode) {
    case 27 : this.clear(); break;
  }

  for (let action in this.keymap) {
    if (jwerty.is(this.keymap[action], e)) {
      this.app.actionManager.run(action, e);
      break;
    }
  }
};

InputManager.prototype.clear = function(e) {
  if (e != undefined && $(e.target).closest('.menu-item').length != 0) {
    return;
  }
  if (this.openMenus.length != 0) {
    for (let openMenu of this.openMenus) {
      openMenu.node.hide();
    }
    this.openMenus = [];
  }
  this.requestedActionInfo = null;
  $('#message-sink').hide();
};

InputManager.prototype.handleActionClick = function(event) {
  var target = $(event.currentTarget);
  var action = target.data('action');
  if (action != undefined) {
    this.clear();
    EventData.set(event, 'menu-button', target);
    this.app.actionManager.run(action, event);
  }
};

InputManager.prototype.registerOpenMenu = function(menu) {
  fit(menu.node, $('body'));
  this.openMenus.push(menu);
};

InputManager.messageSink = function() {
  return $('#message-sink');
};

InputManager.prototype.emptyInfo = function() {
  this.requestedActionInfo = null;
  var messageSink = InputManager.messageSink();
  messageSink.empty();
  messageSink.hide();
};

InputManager.prototype.showActionInfo = function(el) {
  //show hint immediately and deffer showing the full info
  var hint = el.data('actionHint');
  if (hint) {
    InputManager.messageSink().text(hint);
    this.showMessageSinkAround();
  }
  this.requestInfo(el.data('action'));
};

InputManager.prototype.info = function(text) {
  InputManager.messageSink().html(text);
  this.showMessageSinkAround();
};

InputManager.prototype.showMessageSinkAround = function() {
  var messageSink = InputManager.messageSink();
  messageSink.show();
  messageSink.offset({left: this.mouseInfo.pageX + 10, top: this.mouseInfo.pageY + 10});
  fit(messageSink, $('body'));
};

InputManager.prototype.requestInfo = function(action) {
  this.requestedActionInfo = action;
  setTimeout(() => {
    var actionId = this.requestedActionInfo;
    this.requestedActionInfo = null;
    if (actionId != null) {
      const action = this.app.actionManager.actions[actionId];
      if (action) {
        var hotkey = this.keymap[actionId];
        InputManager.messageSink().html(
          (action.state.hint ? action.state.hint  : '') +
          ('<div>' + action.info + '</div>') +
          (hotkey ? '<div  >hotkey: ' + hotkey + '</div>' : ''));
        this.showMessageSinkAround();
      }
    }
  }, 1000);
};