import {cssIconsToClasses} from '../actions/actions'
import {EventData} from '../ui/utils'


export default function Menu(menuActions, inputManager) {
  this.inputManager = inputManager;
  this.node = $('<div>', {
    'class' : 'menu'
  });
  let container = $('<div>', {'class': 'menu-container'});
  this.node.append(container);
  let separatorAllowed = false;
  for (var i = 0; i < menuActions.length; i++) {
    var action = menuActions[i];
    if (action.type == 'separator') {
      container.append($('<div>', {'class': 'menu-separator'}));
      separatorAllowed = false;
      continue;
    }
    separatorAllowed = i != menuActions.length - 1;
    let menuItem = $('<div>', {'class' : 'menu-item action-item'});
    menuItem.data('action', action.id);
    menuItem.addClass('icon16-left');
    if (action.icon32 != undefined) {
      menuItem.css({
        'background-image' : 'url('+action.icon32+')'
      });
    } else if (action.cssIcons != undefined) {
      menuItem.append($('<i>', {'class': 'fa ' + cssIconsToClasses(action.cssIcons)})).append(' ');
    } else {
    }
    menuItem.append($('<span>',{text: action.label}));
    var hotkey = this.inputManager.keymap[action.id];
    if (hotkey) {
      hotkey = hotkey.replace(/\s/g, '');
      if (hotkey.length < 15) {
        menuItem.append($('<span>',{text: hotkey,'class' : 'action-hotkey-info'}));
      }
    }
    
    container.append(menuItem);
    var uiUpdater = (state) => {
      if (state.enabled) {
        menuItem.removeClass('action-disabled');
      } else {
        menuItem.addClass('action-disabled');
      }
      menuItem.data('actionHint', state.hint);
    };
    uiUpdater(action.state);
    this.inputManager.app.actionManager.subscribe(action.id, uiUpdater);
  }
  this.node.hide();
  $('body').append(this.node);
};

Menu.prototype.show = function(app, event) {
  this.node.removeClass('menu-flat-top');
  this.node.removeClass('menu-flat-bottom');
  this.node.show(); //node should be visible to get right dimensions
  const r = Math.round;
  let source = EventData.get(event, 'menu-button');
  if (source != undefined) {
    var off = source.offset();
    var orientation = source.data('menuOrientation');
    if (orientation == 'up') {
      this.node.addClass('menu-flat-bottom');
      this.node.offset({
        left: r(off.left),
        top: r(off.top - this.node.outerHeight())
      });
    } else if (orientation == 'down') {
      this.node.addClass('menu-flat-top');
      this.node.offset({
        left: r(off.left),
        top: r(off.top + source.outerHeight())
      });
    } else {
    }
  } else {
    var mouseInfo = this.inputManager.mouseInfo;
    if (mouseInfo != null) {
      this.node.offset({
        left: r(mouseInfo.pageX - this.node.outerWidth() / 2),
        top: r(mouseInfo.pageY - this.node.outerHeight() / 2)
      });
    }
  }
  this.inputManager.registerOpenMenu(this);
};

