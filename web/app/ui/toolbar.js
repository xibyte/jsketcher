
export default function ToolBar() {
  this.node = $('<div>', {
    css :{
      'position': 'absolute', 
      'left': '260px', 
      'top': '10px',
      'background-color': 'rgba(255, 255, 255, 0.5)',
      'padding': '5px',
      'border-radius' : '5px'
    }
  }); 
}

ToolBar.prototype.add = function(caption, icon, action) {
  var btn = $('<div>', {
    'class': 'tc-toolbar-btn tc-squeezed-text',
    text : caption,
    css: ToolBar.buttonCss({
      'background-image': 'url('+icon+')',
      'background-repeat': 'no-repeat',
      'background-position-x': 'center',
      'background-position-y': 'top',
      'background-size': '48px 48px'
    })
  });
  btn.click(action);
  this.node.append(btn);
  return btn;
};

ToolBar.prototype.addFa = function(faIcon, action) {
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