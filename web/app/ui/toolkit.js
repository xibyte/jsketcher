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

TCAD.toolkit.CheckBox = function(title, checked) {
  this.root = $('<div/>',
    {class: 'tc-row tc-ctrl'});
  this.root.append('<label><input type="checkbox">' + title + '</label>')
  this.input = this.root.find("input");
  this.input.prop('checked', !!checked);
};

TCAD.toolkit.InlineRadio = function(choiceLabels, choiceValues, checkedIndex) {
  var name = 'TCAD.toolkit.InlineRadio_' + (TCAD.toolkit.InlineRadio.COUNTER++)
  this.root = $('<div/>',
    {class: 'tc-row tc-ctrl tc-inline-radio'});
  this.inputs = [];
  for (var i = 0; i < choiceLabels.length; i++) {
    var checked = checkedIndex === i ? "checked" : '';
    var label = $('<label><input type="radio" name="' + name + '" value="' + choiceValues[i] + '">' + choiceLabels[i] + '</label>');
    this.inputs.push(label.find("input"));
     this.root.append(label);
  }
  this.inputs[checkedIndex].prop('checked', true);
};

TCAD.toolkit.InlineRadio.prototype.getValue = function() {
  for (var i = 0; i < this.inputs.length; i++) {
    if (this.inputs[i].prop('checked')) {
      return this.inputs[i].attr('value');
    }
  }
  return null;
};

TCAD.toolkit.InlineRadio.COUNTER = 0;

TCAD.toolkit.propLayout = function(root, name, valueEl) {
  root.append($('<span/>', {class: 'tc-prop-name', text: name}))
    .append($('<div/>', {class: 'tc-prop-value'})
    .append(valueEl));
};

TCAD.toolkit.Number = function(name, initValue, baseStep, round) {
  this.root = $('<div/>', {class: 'tc-row tc-ctrl tc-ctrl-number'});
  this.input = $("<input type='text' value='"+initValue+"' />");
  this.slide = false;
  baseStep = baseStep || 1;
  round = round || 0;
  this.min = null;
  this.max = null;
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
    //var floatRegex = /[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/;
    //if (!floatRegex.test(val)) {
    //  $(this).val(val.replace(/[^0-9\.-]/g, ''));
    //}
    trigger.call(this);
  });
  this.input.get(0).addEventListener('mousewheel', function (e) {
    var delta = 0;
    if ( e.wheelDelta ) { // WebKit / Opera / Explorer 9
      delta = e.wheelDelta;
    } else if ( e.detail ) { // Firefox
      delta = - e.detail;
    }
    var val = $(this).val();
    if (!val) val = 0;
    var step = baseStep * (e.shiftKey ? 100 : 1);
    val = parseFloat(val) + (delta < 0 ? -step : step);
    if (scope.min != null && val < scope.min) {
      val = scope.min;
    }
    if (scope.max != null && val > scope.min) {
      val = scope.max;
    }
    if (round !== 0) {
      val = val.toFixed(round);
    }
    $(this).val(val);
    e.preventDefault();
    e.stopPropagation();
    trigger.call(this);
  }, false);
  TCAD.toolkit.propLayout(this.root, name, this.input);
};

TCAD.toolkit.Combo = function(id, label) {
  this.root = $('<div/>', {class: 'tc-row tc-ctrl tc-ctrl-combo'});
  var label = $('<span/>', {class: 'tc-prop-name', text: label});
  this.select = $('<select>', {id : id});
  this.root.append(label)
    .append($('<div/>', {class: 'tc-prop-value'}).append(this.select));
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
      action.call()
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

TCAD.toolkit.List = function() {
  this.root = $('<div/>', {class: 'tc-tree'});
};

TCAD.toolkit.List.prototype.addRow = function(name) {
  var row = $('<div/>', {
    text: name, class: 'tc-row tc-pseudo-btn',
    css: {'margin-left': '10px'}
  });
  this.root.append(row);
  return row;
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

TCAD.Bus = function() {
  this.listeners = {};
};

TCAD.Bus.prototype.subscribe = function(event, callback) {
  var listenerList = this.listeners[event];
  if (listenerList === undefined) {
    listenerList = [];
    this.listeners[event] = listenerList;
  }
  listenerList.push(callback);
};

TCAD.Bus.prototype.notify = function(event, data) {
  var listenerList = this.listeners[event];
  if (listenerList !== undefined) {
    for (var i = 0; i < listenerList.length; i++) {
      listenerList[i](data);
    }
  }
};

TCAD.Bus.Observable = function(initValue) {
  this.value = initValue;
};

TCAD.Bus.prototype.defineObservable = function(scope, name, eventName, initValue) {
  var observable = new TCAD.Bus.Observable(initValue);
  var bus = this;
  return Object.defineProperty(scope, name, {
    get: function() { return observable.value;},
    set: function(value) { 
      observable.value = value;
      bus.notify(eventName, value);
    }
  });
};