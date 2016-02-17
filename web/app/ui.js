TCAD.ui = {};


/** @constructor */
TCAD.ui.Window = function(el) {
  this.root = el;
  var root = this.root;
  this.root.find('.tool-caption .rm').click(function() {
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

TCAD.ui.closeWin = function(win) {
  win.root.hide();
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

/** @constructor */
TCAD.ui.List = function(id, model) {
  this.ul = $('<ul>', { class : 'tlist', id : id});
  this.model = model;
  this.template = '<li>$name$<span class="btn rm" style="float: right;"><i class="fa fa-remove"></i></span></li>';
};

TCAD.ui.List.prototype.refresh = function() {
  this.ul.empty();
  var items = this.model.items();
  var model = this.model;
  function makeCallbacks(li, item, index) {
    li.find('.rm').click(function(e) {
      model.remove(item, index);
      e.stopPropagation();
    });
    li.hover(function() {model.hover(item, index)});
    li.mouseleave(function() {model.mouseleave(item, index)});
    li.click(function() {model.click(item, index)});
  }
  

  for (var i = 0; i < items.length; ++i) {
    var item = items[i];
    var li = $(this.template.replace('$name$', item.name));
    this.ul.append(li);
    makeCallbacks(li, item, i)
  }
};

TCAD.ui.Dock = function(dockEl, switcherEl, viewDefinitions) {
  this.viewes = {};
  this.dockEl = dockEl;
  this.order = [];
  function bindClick(dock, switchEl, viewName) {
    switchEl.click(function() {
      if (dock.isVisible(viewName)) {
        dock.hide(viewName);
      } else {
        dock.show(viewName);
      }
    });
  }
  for (var i = 0; i < viewDefinitions.length; i++) {
    var viewDef = viewDefinitions[i];
    var view = {};
    this.viewes[viewDef.name] = view;
    this.order.push(viewDef.name);
    view.node = $('<div>', {class: 'dock-node'});
    var caption = $('<div>', {class: 'tool-caption'});
    caption.append($('<span>', {class: 'txt'}).text(viewDef.name.toUpperCase()));
    caption.append(TCAD.App2D.faBtn(viewDef.icon));
    view.node.append(caption);
    
    view.switch = $('<span>', {class: 'dock-btn'});
    view.switch.append(TCAD.App2D.faBtn(viewDef.icon));
    view.switch.append($('<span>', {class: 'txt'}).text(viewDef.name));
    bindClick(this, view.switch, viewDef.name);
    switcherEl.append(view.switch);
  }
};

TCAD.ui.Dock.prototype.show = function(viewName) {
  var view = this.viewes[viewName];
  if (view.switch.hasClass('selected')) {
    return;
  }
  
  var addAfter = null; 
  for (var i = 0; i < this.order.length; i++) {
    var otherView = this.order[i];
    if (viewName == otherView) break;
    if (this.isVisible(otherView)) {
      addAfter = this.viewes[otherView]
    }
  }
  if (addAfter == null) {
    this.dockEl.find('.tool-caption .no-top-border').removeClass('no-top-border');
    this.dockEl.prepend(view.node);
    view.node.find('.tool-caption').addClass('no-top-border');
  } else {
    view.node.insertAfter(addAfter.node);
  }
  view.switch.addClass('selected');
};

TCAD.ui.Dock.prototype.hide = function(viewName) {
  var view = this.viewes[viewName];
  if (!view.switch.hasClass('selected')) {
    return;
  }
  view.node.detach();
  view.switch.removeClass('selected');
};


TCAD.ui.Dock.prototype.isVisible = function(viewName) {
  return this.viewes[viewName].switch.hasClass('selected');
};

