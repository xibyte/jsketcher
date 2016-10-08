
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
    'class': 'tc-toolbar-btn',
    text : caption,
    css: {
      'background-image': 'url('+icon+')',
      'background-repeat': 'no-repeat',
      'background-position-x': 'center',
      'background-position-y': 'top',
      'background-size': '48px 48px',
      'border-radius' : '5px',
      'width': '53px',
      'padding-top' : '48px',
      'margin-top' : '5px'
    }
  });
  btn.click(action);
  this.node.append(btn);
  return btn;
};