/** @constructor */
export function ReferencePointTool(viewer) {
  this.viewer = viewer;
}

ReferencePointTool.prototype.keydown = function(e) {};
ReferencePointTool.prototype.keypress = function(e) {};
ReferencePointTool.prototype.keyup = function(e) {};

ReferencePointTool.prototype.cleanup = function(e) {
  this.viewer.cleanSnap();
};

ReferencePointTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  this.viewer.snap(p.x, p.y, []);
  this.viewer.refresh();
};

ReferencePointTool.prototype.mouseup = function(e) {
};

ReferencePointTool.prototype.mousedown = function(e) {
  const needSnap = this.viewer.snapped.length != 0;
  let p = needSnap ? this.viewer.snapped.pop() : this.viewer.screenToModel(e);
  this.viewer.referencePoint.x = p.x;
  this.viewer.referencePoint.y = p.y;
  this.viewer.refresh();
  this.viewer.toolManager.releaseControl();
};

ReferencePointTool.prototype.mousewheel = function(e) {
};
