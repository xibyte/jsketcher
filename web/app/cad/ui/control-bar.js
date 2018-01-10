import {cssIconsToClasses} from '../ui/utils'

export default function ControlBar(app, bar) {
  this.app = app;
  this.bar = bar;
}

ControlBar.prototype.add = function(actionName, left, overrides) {
  let action = this.app.actionManager.actions[actionName];
  if (action == undefined) return;
  if (overrides != undefined) {
    action = Object.assign({}, action, overrides);
  }
  const btn = $('<div>', {'class': 'button'});
  if (action.cssIcons != undefined) {
    btn.append($('<i>', {'class': 'fa ' + cssIconsToClasses(action.cssIcons)}));
  }
  if (action.label != undefined && action.label != null) {
    if (action.cssIcons != undefined) {
      btn.append(' ');
    }
    btn.append(action.label);
  }
  var to = this.bar.find(left ? '.left-group' : '.right-group');
  to.append(btn);
  if (action.type == 'binary') {
    this.app.bus.subscribe(action.property, (show) => {
      btn.removeClass('button-selected');
      if (show) {
        btn.addClass('button-selected');
      } 
    })(this.app.state[action.property]);   
  } else if (action.type == 'menu') {
    btn.data('menuOrientation', 'up');
  }
  btn.addClass('action-item');
  btn.data('action', actionName);
  return btn;
};