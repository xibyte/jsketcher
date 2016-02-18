TCAD.ui = {};


/** @constructor */
TCAD.ui.Window = function(el) {
  this.root = el;
  var root = this.root;
  this.root.find('.tool-caption').each(function() {
    var closeBtn = '<span class="btn rm" style="float: right;"><i class="fa fa-remove"></i></span>';
    $(this).append(closeBtn);
  }); 
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
      e.preventDefault();
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
  this.views = {};
  this.dockEl = dockEl;
  function bindClick(dock, switchEl, viewName) {
    switchEl.click(function(e) {
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
    this.views[viewDef.name] = view;
    view.node = $('<div>', {class: 'dock-node'});
    var caption = $('<div>', {class: 'tool-caption'});
    caption.append($('<span>', {class: 'txt'}).text(viewDef.name.toUpperCase()));
    caption.append(TCAD.App2D.faBtn(viewDef.icon));
    view.node.append(caption);
    view.node.hide();
    this.dockEl.append(view.node);
    
    view.switch = $('<span>', {class: 'dock-btn'});
    view.switch.append(TCAD.App2D.faBtn(viewDef.icon));
    view.switch.append($('<span>', {class: 'txt'}).text(viewDef.name));
    bindClick(this, view.switch, viewDef.name);
    switcherEl.append(view.switch);
  }
};

TCAD.ui.Dock.prototype.show = function(viewName) {
  var view = this.views[viewName];
  if (view.switch.hasClass('selected')) {
    return;
  }
  if (!this.dockEl.is(":visible")) {
    this.dockEl.show();
    $('body').trigger('layout');
  }
  view.node.show();
  view.switch.addClass('selected');
};

TCAD.ui.Dock.prototype.hide = function(viewName) {
  var view = this.views[viewName];
  if (!view.switch.hasClass('selected')) {
    return;
  }
  view.node.hide();
  view.switch.removeClass('selected');
  if (this.dockEl.find('.dock-node:visible').length == 0) {
    this.dockEl.hide();
    $('body').trigger('layout');
  } 
};

TCAD.ui.Dock.prototype.isVisible = function(viewName) {
  return this.views[viewName].switch.hasClass('selected');
};

TCAD.ui.WinManager = function() {
  this.moveHandler = null;
  var wm = this;
  $('body').mousemove(function(e) {
    if (wm.moveHandler != null) {
      wm.moveHandler(e);
      e.preventDefault();
    }  
  });
};

TCAD.ui.WinManager.prototype.makeHRResizable = function(el) {
  var origin = {x : NaN, y : NaN};
  var originSize = {x : NaN, y : NaN};
  var wm = this;
  function onEdge(e, el) {
    var offset = el.offset();
    var width = el.width();
    return e.pageX > offset.left + width;
  }
  function mousemove(e) {
    var dx = e.pageX - origin.x;
    var dy = e.pageY - origin.y;
    var newWidth = originSize.x + dx;
    el.css('width', (newWidth) + 'px');
    $('body').trigger('layout');
  }
  el.mousedown(function(e) {
    if (!onEdge(e, $(this))) {
      stopDrag(e);
      return;
    }
    origin.x = e.pageX;
    origin.y = e.pageY;
    originSize.x = el.width()
    wm.moveHandler = mousemove;
  });
  var stopDrag = function(e) {
    origin.x = NaN;
    origin.y = NaN;
    wm.moveHandler = null;
  };
  
  el.mouseup(stopDrag);
  el.mousemove(function(e) {
    if (onEdge(e, $(this))) {
      el.css('cursor', 'ew-resize');
    } else {
      el.css('cursor', 'inherited');
    }
  });
};
