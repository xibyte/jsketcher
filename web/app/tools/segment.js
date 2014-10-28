
TCAD.TWO.AddSegmentTool = function(viewer, layer) {
  this.viewer = viewer;
  this.layer = layer;
  this.line = null;
};

TCAD.TWO.AddSegmentTool.prototype.mousemove = function(e) {
  if (this.line != null) {
    var p = this.viewer.screenToModel(e);
    this.line.b.x = p.x;
    this.line.b.y = p.y;
    this.viewer.refresh();
  }
};

TCAD.TWO.AddSegmentTool.prototype.mousedown = function(e) {

};

TCAD.TWO.AddSegmentTool.prototype.mouseup = function(e) {
  if (this.line == null) {
    var p = this.viewer.screenToModel(e);
    this.line = this.viewer.addSegment(p.x, p.y, p.x, p.y, this.layer);
    this.viewer.refresh();
  } else {
    this.line = null;
  }
};

TCAD.TWO.AddSegmentTool.prototype.mousewheel = function(e) {
};
