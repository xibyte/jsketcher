export function DefaultMouseEvent() {
  var viewer = $('#viewer-container');
  var off = viewer.offset();
  const r = Math.round;
  this.type = 'click';
  this.canBubble = true;
  this.cancelable = true;
  this.detail = 1;
  this.screenX = r(off.left + viewer.width() / 2);
  this.screenY = r(off.top + viewer.height() / 2);
  this.clientX = this.screenX;
  this.clientY = this.screenY;
  this.pageX = this.screenX;
  this.pageY = this.screenY;
  this.ctrlKey = false;
  this.altKey = false;
  this.shiftKey = false;
  this.metaKey = false;
  this.button = 0;
  this.relatedTarget = null;
}

export const EventData = {
    
  get: function(event, key) {
    if (event.data) {
      return event.data[key];
    } else {
      return undefined;
    }
  },
    
  set: function(event, key, value) {
    if (!event.data) {
      event.data = {};
    }
    event.data[key] = value;
  }
};

export function fit(el, relativeEl) {
  const span = 5;
  var relOff = relativeEl.offset();
  var off = el.offset();

  var needToSet = false;
  if (off.left < relOff.left ) {
    off.left = relOff.left + span;
    needToSet = true;
  }
  const right = relOff.left + relativeEl.width() - span;
  var outerWidth = el.outerWidth();
  if (off.left + outerWidth >= right) {
    off.left = right - outerWidth;
    needToSet = true;
  }
  if (off.top < relOff.top + span) {
    off.top = relOff.top + span;
    needToSet = true;
  }
  var bottom = relOff.top + relativeEl.height() - span;
  var outerHeight = el.outerHeight();
  if (off.top + outerHeight >= bottom) {
    off.top = bottom - outerHeight;
    needToSet = true;
  }
  if (needToSet) {
    el.css({
      left: off.left + 'px',
      top: off.top + 'px'
    });
  }
}

export function LoadTemplate(name) {
  return require('./tmpl/' + name + '.html');
} 