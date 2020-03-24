export function TestMouseEvent(x, y, type, attrs) {
  this.type = type ? type : 'click';
  this.canBubble = true;
  this.cancelable = true;
  this.detail = 1;
  this.screenX = x;
  this.screenY = y;
  this.clientX = this.screenX;
  this.clientY = this.screenY;
  this.pageX = this.screenX;
  this.pageY = this.screenY;
  this.offsetX = this.screenX;
  this.offsetY = this.screenY;
  this.ctrlKey = false;
  this.altKey = false;
  this.shiftKey = false;
  this.metaKey = false;
  this.button = 0;
  this.relatedTarget = null;
  if (attrs) {
    Object.assign(this, attrs);
  }
}
