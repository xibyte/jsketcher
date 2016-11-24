
/** @constructor */
function Window(el, winManager) {
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
  var DIRS = DIRECTIONS;
  winManager.registerResize(this.root, DIRS.NORTH | DIRS.SOUTH | DIRS.WEST | DIRS.EAST);
  winManager.registerDrag(this.root, caption);
}

Window.prototype.toggle = function() {
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

Window.prototype.tileUpPolicy = function(firstTime, relativeEl) {
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

function WinManager() {
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
}

WinManager.prototype.captureDrag = function(el, e) {
  var origin = {x : e.pageX, y : e.pageY};
  var originLocation = el.offset();
  this.moveHandler = function(e) {
    var dx = e.pageX - origin.x;
    var dy = e.pageY - origin.y;
    el.offset({left : originLocation.left + dx, top : originLocation.top + dy});
  };
};

WinManager.prototype.captureResize = function(el, dirMask, e, onResize) {
  
  var origin = {x : e.pageX, y : e.pageY};
  var originSize = {x : el.width(), y : el.height()};
  var originLocation = el.offset();
  var north = _maskTest(dirMask, DIRECTIONS.NORTH);
  var south = _maskTest(dirMask, DIRECTIONS.SOUTH);
  var west = _maskTest(dirMask, DIRECTIONS.WEST);
  var east = _maskTest(dirMask, DIRECTIONS.EAST);
  
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

var DIRECTIONS = {
  NORTH : 0x0001,
  SOUTH : 0x0010,
  WEST :  0x0100,
  EAST :  0x1000,
};

WinManager.prototype.registerResize = function(el, dirMask, onResize) {
  var wm = this;
  var north = _maskTest(dirMask, DIRECTIONS.NORTH);
  var south = _maskTest(dirMask, DIRECTIONS.SOUTH);
  var west = _maskTest(dirMask, DIRECTIONS.WEST);
  var east = _maskTest(dirMask, DIRECTIONS.EAST);

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
      wm.captureResize(el, DIRECTIONS.NORTH | DIRECTIONS.EAST, e, onResize);
    } else if (north && west && onNorthEdge(e, $this) && onWestEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.NORTH | DIRECTIONS.WEST, e, onResize);
    } else if (south && east && onSouthEdge(e, $this) && onEastEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.SOUTH | DIRECTIONS.EAST, e, onResize);
    } else if (south && west && onSouthEdge(e, $this) && onWestEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.SOUTH | DIRECTIONS.WEST, e, onResize);
    } else if (north && onNorthEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.NORTH, e, onResize);
    } else if (south && onSouthEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.SOUTH, e, onResize);
    } else if (west && onWestEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.WEST, e, onResize);
    } else if (east && onEastEdge(e, $this)) {
      wm.captureResize(el, DIRECTIONS.EAST, e, onResize);
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

WinManager.prototype.registerDrag = function(el, dragger) {
  var wm = this;
  dragger.mousedown(function(e) {
    wm.captureDrag(el, e);
  });
};

function bindOpening(btn, win) {
 btn.click(function(e) {
    openWin(win, e);
  });
}

function createActionsWinBuilder(win) {
  var content = win.root.find('.content');
  var template = content.html();
  content.empty();
  return function(name, action) {
    content.append(template.replace("$value$", name));
    content.find('div:last input').click(action);
  };
}

function closeWin(win) {
  win.root.hide();
}

function openWin(win, mouseEvent) {

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

}

/** @constructor */
function List(id, model) {
  this.ul = $('<ul>', { 'class' : 'tlist', id : id});
  this.model = model;
  this.template = '<li>$name$<span class="btn rm" style="float: right;"><i class="fa fa-remove"></i></span></li>';
}

List.prototype.refresh = function() {
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

function dockBtn(name, icon) {
  var btn = $('<span>', {'class': 'dock-btn'});
  btn.append(faBtn(icon));
  btn.append($('<span>', {'class': 'txt'}).text(name));
  return btn;
}

function faBtn (iconName) {
  return $('<i>', {'class' : 'fa fa-'+iconName});
}

function Dock(dockEl, switcherEl, viewDefinitions) {
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
    view.node = $('<div>', {'class': 'dock-node'});
    var caption = $('<div>', {'class': 'tool-caption'});
    caption.append($('<span>', {'class': 'txt'}).text(viewDef.name.toUpperCase()));
    caption.append(faBtn(viewDef.icon));
    view.node.append(caption);
    view.node.hide();
    this.dockEl.append(view.node);
    view.switchBtn = dockBtn(viewDef.name, viewDef.icon);
    bindClick(this, view.switchBtn, viewDef.name);
    switcherEl.append(view.switchBtn);
  }
}

Dock.prototype.show = function(viewName) {
  var view = this.views[viewName];
  if (view.switchBtn.hasClass('selected')) {
    return;
  }
  if (!this.dockEl.is(":visible")) {
    this.dockEl.show();
    $('body').trigger('layout');
  }
  view.node.show();
  view.switchBtn.addClass('selected');
};

Dock.prototype.hide = function(viewName) {
  var view = this.views[viewName];
  if (!view.switchBtn.hasClass('selected')) {
    return;
  }
  view.node.hide();
  view.switchBtn.removeClass('selected');
  if (this.dockEl.find('.dock-node:visible').length == 0) {
    this.dockEl.hide();
    $('body').trigger('layout');
  } 
};

Dock.prototype.isVisible = function(viewName) {
  return this.views[viewName].switchBtn.hasClass('selected');
};

function _maskTest(mask, value) {
  return (mask & value) === value;
}

function sharedStartOfSortedArray(array){
  var a1= array[0], a2= array[array.length-1], L= a1.length, i= 0;
  while(i<L && a1.charAt(i)=== a2.charAt(i)) i++;
  return a1.substring(0, i);
}

function Terminal(win, commandProcessor, variantsSupplier) {
  this.win = win;
  const input = win.root.find('.terminal-input input');

  win.onShowCallback = function() {
    input.focus();
  };
  this.history = [];
  this.historyPointer = 0;
  const setHistory = () => {
    if (this.history.length == 0) return;
    input.val(this.history[this.historyPointer]);
  };

  input.keydown((e) => {
    function consumeEvent() {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.keyCode == 9) {
      const text = input.val();
      let variants = variantsSupplier().filter(v => v.startsWith(text));
      variants.sort();
      if (variants.length == 0) {
      } else  {
        const shared = sharedStartOfSortedArray(variants);
        if (shared.length != text.length) {
          input.val(shared);
        } else {
          const out = win.root.find('.terminal-output');
          let autocompleteArea = out.find('.autocomplete-area');
          if (autocompleteArea.length == 0) {
            autocompleteArea = $('<div>', {'class': 'terminal-commandText autocomplete-area'});
            out.append(autocompleteArea);
          }
          let more = '';
          const limit = 20;
          if (variants.length > limit) {
            more = '... and ' + (variants.length - limit) + ' more';
            variants = variants.slice(0,limit);
          }
          autocompleteArea.text(variants.join(' ') + more);
        }
      }
      consumeEvent();
    } else if (e.keyCode == 38) {
      this.historyPointer = Math.max(this.historyPointer - 1, 0);
      setHistory();
      consumeEvent();
    } else if (e.keyCode == 40) {
      if (this.historyPointer != this.history.length) {
        this.historyPointer = Math.min(this.historyPointer + 1, this.history.length - 1);
        setHistory();
      }
      consumeEvent();
    } 
  });

  input.keyup((e) => {
    if(e.keyCode == 13) {
      const command = input.val();
      const out = win.root.find('.terminal-output');
      out.find('.autocomplete-area').remove();
      input.val('');
      out.append($('<div>', {text: '> '+command, 'class': 'terminal-commandText'}));
      if (command != null && command.trim().length != 0) {
        var result = commandProcessor(command);
        out.append($('<div>', {text: result, 'class': 'terminal-commandResult'}));
        this.history.push(command);
        this.historyPointer = this.history.length;
      }
      out.parent().scrollTop(out.height());
    }
  });
  
}

export { WinManager, Window, List, Dock, Terminal, dockBtn, faBtn, openWin, closeWin, bindOpening, createActionsWinBuilder, DIRECTIONS };