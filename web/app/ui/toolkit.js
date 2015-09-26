TCAD.toolkit = {};

TCAD.toolkit.add = function(parent, child) {
  parent.content.append(child.root);
};

TCAD.toolkit.methodRef = function(_this, methodName, args) {
  return function() {
    _this[methodName].apply(_this, args);
  };
};

TCAD.toolkit.Box = function() {
  this.root = this.content = $('<div class="tc-box" />');
  this.root.addClass('tc-box tc-scroll');
  this.root.appendTo('body');
};

TCAD.toolkit.Box.prototype.close = function() {
  this.root.remove();
};

TCAD.toolkit.Folder = function(title) {
  this.root = $('<div/>', {class: 'tc-folder'});
  this.content = $('<div/>');
  this.root.append($('<div/>', {text: title, class: 'tc-row tc-title'}));
  this.root.append(this.content);
};

TCAD.toolkit.Button = function(title) {
  this.root = $('<div/>',
    {class: 'tc-row tc-ctrl tc-ctrl-btn', text: title});
};

TCAD.toolkit.propLayout = function(root, name, valueEl) {
  root.append($('<span/>', {class: 'tc-prop-name', text: name}))
    .append($('<div/>', {class: 'tc-prop-value'})
    .append(valueEl));
};

TCAD.toolkit.Number = function(name, initValue) {
  this.root = $('<div/>', {class: 'tc-row tc-ctrl tc-ctrl-number'});
  this.input = $("<input type='text' value='"+initValue+"' />");
  this.slide = false;
  var scope = this;
  var lastValue = null;
  function trigger() {
    if ($(this).val() !== lastValue) {
      $(this).trigger('t-change');
      lastValue = $(this).val();
    }
  }
  this.input.on('input', function(e) {
    var val = $(this).val();
    try {
      parseFloat(val)
    } catch (e) {
      $(this).val(val.replace(/[^0-9\.]/g, ''));
    }
    trigger.call(this);
  });
  this.input.get(0).addEventListener('mousewheel', function (e) {
    var delta = 0;
    if ( e.wheelDelta ) { // WebKit / Opera / Explorer 9
      delta = e.wheelDelta;
    } else if ( e.detail ) { // Firefox
      delta = - e.detail;
    }
    var step = 0.05;

    var val = $(this).val();
    if (!val) val = 0;
    val = parseFloat(val) + (delta < 0 ? -1 : 1);
    $(this).val(val);
    e.preventDefault();
    e.stopPropagation();
    trigger.call(this);
  }, false);
  TCAD.toolkit.propLayout(this.root, name, this.input);
};

TCAD.toolkit.Text = function(name) {
  this.root = $('<div/>', {class: 'tc-row tc-ctrl tc-ctrl-text'});
  TCAD.toolkit.propLayout(this.root, name, $('<input type="text"/>'));
};

TCAD.toolkit.ButtonRow = function(captions, actions) {

  this.root = $('<div/>',
    {class: 'tc-row tc-ctrl tc-buttons-block'});

  function withAction(btn, action) {
    return btn.click(function(){
      actions[i].call()
    });
  }
  for (var i = 0; i < captions.length; i++) {
    var caption = captions[i];
    var btn = $('<span/>', {
      text: caption,
      class: 'tc-buttons-block-item'
    });
    withAction(btn, actions[i]);
    this.root.append(btn);
  }
};

TCAD.toolkit.Tree = function() {
  this.root = $('<div/>', {class: 'tc-tree'});
};

TCAD.toolkit.Tree.prototype.set = function(data) {
  this.root.empty();
  this._fill(data, 0);
};

TCAD.toolkit.Tree.prototype._fill = function(data, level) {
  var notLeaf = data.children !== undefined && data.children.length !== 0;
  if (data.name !== undefined) {
    this.root.append($('<div/>', {
      text: data.name, class: 'tc-row' + (notLeaf ? ' tc-chevron-open' : ''),
      css: {'margin-left': level * (notLeaf ? 10 : 16) + 'px'}
    }));
  }
  if (notLeaf) {
    for (var i = 0; i < data.children.length; i++) {
      var child = data.children[i];
      this._fill(child, level + 1);
    }
  }
};
