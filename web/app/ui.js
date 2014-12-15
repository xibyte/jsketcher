TCAD.ui = {};


TCAD.ui.Window = function(el) {
  this.root = el;
  var root = this.root;
  this.root.find('.tool-caption .rm input').click(function() {
    root.hide();
  });
};

TCAD.ui.bindOpening = function(btn, win) {

  btn.click(function(e) {
    TCAD.ui.openWin(win, e);
  });
};

TCAD.ui.createActionsWinBuilder = function(win) {
  var content = win.root.find('.content');
  var template = content.html();
  content.empty();
  return function(name, action) {
    content.append(template.replace("$value$", name));
    content.find('div:last input').click(action);
  };
};

TCAD.ui.openWin = function(win, mouseEvent) {

  var x = mouseEvent.pageX;
  var y = mouseEvent.pageY;
  var pageW = $(window).width();
  var pageH = $(window).height();
  var winW = win.root.width();
  var winH = win.root.height();

  var left = x < pageW / 2 ? x : x - winW;
  var top = y < pageH / 2 ? y : y - winH;

  win.root.show();
  win.root.offset({top : top, left : left});

};

TCAD.ui.List = function(el, model) {
  this.ul = el;
  this.template = this.ul.html();
  this.ul.empty();
  this.model = model;
};

TCAD.ui.List.prototype.refresh = function() {
  this.ul.empty();
  var items = this.model.items();
  var model = this.model;
  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    this.ul.append(this.template.replace('$name$', item.name));
    this.ul.find('li:last input').click(function() {model.remove(item, i)});
    this.ul.find('li:last').hover(function() {model.hover(item, i)});
  }
};