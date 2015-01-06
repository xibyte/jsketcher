
TCAD.TWO.AddSegmentTool = function(viewer, layer, multi) {
  this.viewer = viewer;
  this.layer = layer;
  this.line = null;
  this.multi = multi;
};

TCAD.TWO.AddSegmentTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  if (this.line != null) {
    this.viewer.snap(p.x, p.y, [this.line.a, this.line.b]);
    this.line.b.x = p.x;
    this.line.b.y = p.y;
    this.viewer.refresh();
  } else {
    this.viewer.snap(p.x, p.y, []);
    this.viewer.refresh();
  }
};

TCAD.TWO.AddSegmentTool.prototype.cleanup = function(e) {
  this.viewer.cleanSnap();  
};

TCAD.TWO.AddSegmentTool.prototype.mousedown = function(e) {
  
};

TCAD.TWO.AddSegmentTool.prototype.mouseup = function(e) {
  if (this.line == null) {
    var b = this.viewer.screenToModel(e);
    var a = b;
    var needSnap = false;
    if (this.viewer.snapped.length != 0) {
      a = this.viewer.snapped.pop();
      this.viewer.cleanSnap();
      needSnap = true;
    }
    this.line = this.viewer.addSegment(a.x, a.y, b.x, b.y, this.layer);
    if (needSnap) {
      this.viewer.parametricManager.linkObjects([this.line.a, a]);
    }
    this.viewer.refresh();
  } else {
    if (this.viewer.snapped.length != 0) {
      var p = this.viewer.snapped.pop();
      this.viewer.cleanSnap();
      this.line.b.x = p.x;
      this.line.b.y = p.y;
      this.viewer.parametricManager.linkObjects([this.line.b, p]);
      this.viewer.refresh();
    }
    if (this.multi) {
      var b = this.line.b; 
      this.line = this.viewer.addSegment(b.x, b.y, b.x, b.y, this.layer);
      this.viewer.parametricManager.linkObjects([this.line.a, b]);
    } else {
      this.line = null;
    }
  }
};

TCAD.TWO.AddSegmentTool.prototype.mousewheel = function(e) {
};

TCAD.TWO.AddSegmentTool.prototype.keydown = function(e) {
  if (this.multi && this.line != null && e.keyCode == 27) {
    this.viewer.remove(this.line);
    this.viewer.refresh();
  }    
};

TCAD.TWO.AddSegmentTool.prototype.keypress = function(e) {};
TCAD.TWO.AddSegmentTool.prototype.keyup = function(e) {};


TCAD.TWO.AddPointTool = function(viewer, layer) {
  this.viewer = viewer;
  this.layer = layer;
};

TCAD.TWO.AddPointTool.prototype.mousemove = function(e) {
};

TCAD.TWO.AddPointTool.prototype.cleanup = function(e) {
};

TCAD.TWO.AddPointTool.prototype.mousedown = function(e) {
};

TCAD.TWO.AddPointTool.prototype.mouseup = function(e) {
  var a = this.viewer.screenToModel(e);
  var p = new TCAD.TWO.EndPoint(a.x, a.y);
  this.layer.objects.push(p);
  p.layer = this.layer;
  this.viewer.refresh();
};

TCAD.TWO.AddPointTool.prototype.mousewheel = function(e) {
};

TCAD.TWO.AddPointTool.prototype.keydown = function(e) {
};

TCAD.TWO.AddSegmentTool.prototype.keypress = function(e) {};
TCAD.TWO.AddSegmentTool.prototype.keyup = function(e) {};
