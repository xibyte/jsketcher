TCAD.ui = {};

/** @constructor */
TCAD.ui.Window = function(el, winManager) {
  this.root = el;
  this.neverOpened = !this.root.is(':visible');
  this.tileUpRelative = $('body');
  this.onShowCallback = null;
  var root = this.root;
  var caption = this.root.find('.tool-caption');
  caption.each(function() {
    var closeBtn = '<span class="btn rm" style="float: right;"><i class="fa fa-remove"></i></span>';
    $(this).append(closeBtn);
  }); 
  this.root.find('.tool-caption .rm').click(function() {
    root.hide();
  });
  var DIRS = TCAD.ui.DIRECTIONS;
  winManager.registerResize(this.root, DIRS.NORTH | DIRS.SOUTH | DIRS.WEST | DIRS.EAST);
  winManager.registerDrag(this.root, caption);
};

TCAD.ui.Window.prototype.toggle = function() {
  var aboutToShow = !this.root.is(':visible');
  if (aboutToShow) {
    this.tileUpPolicy(this.neverOpened, this.tileUpRelative);
  }
  this.neverOpened = false ;
  this.root.toggle();
  if (aboutToShow && this.onShowCallback != null) {
    this.onShowCallback(this);
  }
};

TCAD.ui.Window.prototype.tileUpPolicy = function(firstTime, relativeEl) {
  var span = 20;
  var relOff = relativeEl.offset();
  var off = this.root.offset();
  off = {
    left: parseInt(this.root.css('left')),
    top: parseInt(this.root.css('top'))
  };

  if (firstTime) {
    off = {
      left: relOff.left + relativeEl.width() - this.root.width() - span,
      top: relOff.top + relativeEl.height() - this.root.height() - span
    };
    this.root.css({
      left: off.left + 'px',
      top: off.top + 'px'
    });
  }
  var needToSet = false;
  if (off.left < relOff.left || off.left >= relOff.left + relativeEl.width() - span) {
    off.left = relOff.left + span;
    needToSet = true;
  }
  if (off.top < relOff.top || off.top >= relOff.top + relativeEl.height() - span) {
    off.top = relOff.top + span;
    needToSet = true;
  }
  if (needToSet) {
    this.root.css({
      left: off.left + 'px',
      top: off.top + 'px'
    });
  }
  //var fixedWidth = null;
  //var fixedHeight = null;
  //
  //if (off.left + this.root.width() > relOff.left + relativeEl.width()) {
  //  fixedWidth = this.root.width() - span * 2; 
  //}
  //if (off.top + this.root.height() > relOff.top + relativeEl.height()) {
  //  fixedHeight = this.root.width() - span * 2;
  //}
  //if (fixedWidth != null) {
  //  console.log(fixedWidth)
  //  this.root.css({ width : fixedWidth + 'px'});
  //}
  //if (fixedHeight != null) {
  //  this.root.css({ height : fixedHeight + 'px'});
  //}
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
  $('body').mouseup(function(e) {
    wm.moveHandler = null;
  });
};

TCAD.ui.WinManager.prototype.captureDrag = function(el, e) {
  var origin = {x : e.pageX, y : e.pageY};
  var originLocation = el.offset();
  this.moveHandler = function(e) {
    var dx = e.pageX - origin.x;
    var dy = e.pageY - origin.y;
    el.offset({left : originLocation.left + dx, top : originLocation.top + dy});
  };
};

TCAD.ui.WinManager.prototype.captureResize = function(el, dirMask, e, onResize) {
  
  var origin = {x : e.pageX, y : e.pageY};
  var originSize = {x : el.width(), y : el.height()};
  var originLocation = el.offset();
  var north = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.NORTH);
  var south = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.SOUTH);
  var west = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.WEST);
  var east = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.EAST);
  
  this.moveHandler = function(e) {
    var dx = e.pageX - origin.x;
    var dy = e.pageY - origin.y;
    if (east) {
      el.css('width', (originSize.x + dx) + 'px');
    }
    var top = originLocation.top;
    var left = originLocation.left;
    var setLoc = false;
    if (west) {
      el.css('width', (originSize.x - dx) + 'px');
      left += dx;
      setLoc = true;
    }
    if (south) {
      el.css('height', (originSize.y + dy) + 'px');
    }
    if (north) {
      el.css('height', (originSize.y - dy) + 'px');
      top += dy;
      setLoc = true;
    }
    if (setLoc) {
      el.offset({left : left, top: top});
    }
    if (onResize !== undefined) {
      onResize();
    }
  }
};

TCAD.ui.DIRECTIONS = {
  NORTH : 0x0001,
  SOUTH : 0x0010,
  WEST :  0x0100,
  EAST :  0x1000,
};

TCAD.ui.WinManager.prototype.registerResize = function(el, dirMask, onResize) {
  var wm = this;
  var north = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.NORTH);
  var south = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.SOUTH);
  var west = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.WEST);
  var east = TCAD.ui._maskTest(dirMask, TCAD.ui.DIRECTIONS.EAST);

  var borderTop = parseInt(el.css('borderTopWidth'), 10);
  var borderLeft = parseInt(el.css('borderLeftWidth'), 10);
  
  function onNorthEdge(e, el) {
    var offset = el.offset();
    return e.pageY < offset.top + borderTop;
  }

  function onSouthEdge(e, el) {
    var offset = el.offset();
    var height = el.height();
    return e.pageY > offset.top + height + borderTop;
  }

  function onWestEdge(e, el) {
    var offset = el.offset();
    return e.pageX < offset.left + borderLeft;
  }

  function onEastEdge(e, el) {
    var offset = el.offset();
    var width = el.width();
    return e.pageX > offset.left + width + borderLeft;
  }
  
  
  el.mousedown(function(e) {
    var $this = $(this);
    if (north && east && onNorthEdge(e, $this) && onEastEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.NORTH | TCAD.ui.DIRECTIONS.EAST, e, onResize);
    } else if (north && west && onNorthEdge(e, $this) && onWestEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.NORTH | TCAD.ui.DIRECTIONS.WEST, e, onResize);
    } else if (south && east && onSouthEdge(e, $this) && onEastEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.SOUTH | TCAD.ui.DIRECTIONS.EAST, e, onResize);
    } else if (south && west && onSouthEdge(e, $this) && onWestEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.SOUTH | TCAD.ui.DIRECTIONS.WEST, e, onResize);
    } else if (north && onNorthEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.NORTH, e, onResize);
    } else if (south && onSouthEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.SOUTH, e, onResize);
    } else if (west && onWestEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.WEST, e, onResize);
    } else if (east && onEastEdge(e, $this)) {
      wm.captureResize(el, TCAD.ui.DIRECTIONS.EAST, e, onResize);
    }
  });
  el.mousemove(function(e) {

    var $this = $(this);
    if (north && east && onNorthEdge(e, $this) && onEastEdge(e, $this)) {
      el.css('cursor', 'nesw-resize');
    } else if (north && west && onNorthEdge(e, $this) && onWestEdge(e, $this)) {
      el.css('cursor', 'nwse-resize');
    } else if (south && east && onSouthEdge(e, $this) && onEastEdge(e, $this)) {
      el.css('cursor', 'nwse-resize');
    } else if (south && west && onSouthEdge(e, $this) && onWestEdge(e, $this)) {
      el.css('cursor', 'nesw-resize');
    } else if (south && onSouthEdge(e, $this)) {
      el.css('cursor', 'ns-resize');
    } else if (north && onNorthEdge(e, $this)) {
      el.css('cursor', 'ns-resize');
    } else if (east && onEastEdge(e, $this)) {
      el.css('cursor', 'ew-resize');
    } else if (west && onWestEdge(e, $this)) {
      el.css('cursor', 'ew-resize');
    } else {
      el.css('cursor', 'inherited');
    }
  });
};

TCAD.ui.WinManager.prototype.registerDrag = function(el, dragger) {
  var wm = this;
  dragger.mousedown(function(e) {
    wm.captureDrag(el, e);
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

TCAD.ui.dockBtn = function(name, icon) {
  var btn = $('<span>', {class: 'dock-btn'});
  btn.append(TCAD.App2D.faBtn(icon));
  btn.append($('<span>', {class: 'txt'}).text(name));
  return btn;
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
    view.switch = TCAD.ui.dockBtn(viewDef.name, viewDef.icon);
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

TCAD.ui._maskTest = function (mask, value) {
  return (mask & value) === value;
};


TCAD.ui.Terminal = function(win, commandProcessor) {
  this.win = win;
  win.onShowCallback = function() {
    win.root.find('.terminal-input input').focus();
  };

  win.root.find('.terminal-input input').keyup(function(e){
    if(e.keyCode == 13) {
      var input = win.root.find('.terminal-input input');
      var command = input.val();
      var out = win.root.find('.terminal-output');
      input.val('');
      out.append($('<div>', {text: '> '+command, class: 'terminal-commandText'}));
      if (command != null && command.trim().length != 0) {
        var result = commandProcessor(command);
        out.append($('<div>', {text: result, class: 'terminal-commandResult'}));
      }
      out.scrollTop(out.height());
    }
  });
};