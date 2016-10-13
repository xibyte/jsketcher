import {capitalize} from 'utils'

export default function ToolBar(app) {
  this.app = app;
  this.node = $('<div>', {
    css :{
      'position': 'absolute', 
      'background-color': 'rgba(255, 255, 255, 0.5)',
      'padding': '5px',
      'border-radius' : '5px'
    }
  }); 
}

ToolBar.prototype.add = function(action) {
  if (!action) return;
  var btn = $('<div>', {
    'class': 'tc-toolbar-btn tc-squeezed-text action-item',
    text : capitalize(action.label),
    css: ToolBar.buttonCss({
      'background-image': 'url('+action.icon96+')',
      'background-repeat': 'no-repeat',
      'background-position-x': 'center',
      'background-position-y': 'top',
      'background-size': '48px 48px'
    })
  });
  btn.attr('data-action', action.id);
  this.app.actionManager.subscribe(action.id, (state) => {
    if (state.enabled) {
      btn.removeClass('action-disabled');
    } else {
      btn.addClass('action-disabled');
    }
  });
  this.node.append(btn);
  return btn;
};

ToolBar.prototype.addFa = function(faIcon, action) {
  if (!action) return;
  var btn = $('<div>', {
    'class': 'tc-toolbar-btn',
    css : {
      'border-radius' : '5px',
      'padding' : '5px'
    }
  });
  btn.click(action);
  btn.append($('<i>', {
    'class' : 'fa fa-' + faIcon,
    css: {
      'vertical-align': 'middle'
    }
  }));
  this.node.append(btn);
  return btn;
};

ToolBar.buttonCss = function(css) {
  return Object.assign(css, {
    'border-radius' : '5px',
    'width': '53px',
    'padding-top' : '48px',
    'margin-top' : '5px'
  })
};