/** @constructor */
TCAD.TWO.Circle = function(c) {
  TCAD.TWO.SketchObject.call(this);
  this.c = c;
  c.parent = this;
  this.children.push(c);
  this.r = new TCAD.TWO.Ref(0);
};

TCAD.TWO.utils.extend(TCAD.TWO.Circle, TCAD.TWO.SketchObject);

TCAD.TWO.Circle.prototype._class = 'TCAD.TWO.Circle';

TCAD.TWO.Circle.prototype.collectParams = function(params) {
  this.c.collectParams(params);
  params.push(this.r);
};

TCAD.TWO.Circle.prototype.getReferencePoint = function() {
  return this.c;
};

TCAD.TWO.Circle.prototype.translateImpl = function(dx, dy) {
  this.c.translate(dx, dy);
};

TCAD.TWO.Circle.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  ctx.arc(this.c.x, this.c.y, this.r.get(), 0, 2 * Math.PI);
  ctx.stroke();
};

TCAD.TWO.Circle.prototype.normalDistance = function(aim) {
  return Math.abs(TCAD.math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.r.get());
};

TCAD.TWO.Circle.prototype.getDefaultTool = function(viewer) {
  var editTool = new TCAD.TWO.EditCircleTool(viewer, null);
  editTool.circle = this;
  return editTool;
};

/** @constructor */
TCAD.TWO.EditCircleTool = function(viewer) {
  this.viewer = viewer;
  this.circle = null;
};

TCAD.TWO.EditCircleTool.prototype.keydown = function(e) {};
TCAD.TWO.EditCircleTool.prototype.keypress = function(e) {};
TCAD.TWO.EditCircleTool.prototype.keyup = function(e) {};

TCAD.TWO.EditCircleTool.prototype.cleanup = function(e) {
  this.viewer.cleanSnap();
};

TCAD.TWO.EditCircleTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  if (this.circle != null) {
    var r = TCAD.math.distance(p.x, p.y, this.circle.c.x, this.circle.c.y);
    this.circle.r.set(r);
    if (!e.shiftKey) {
      this.solveRequest(true);
    }
  } else {
    this.viewer.snap(p.x, p.y, []);
  }
  this.viewer.refresh();
};

TCAD.TWO.EditCircleTool.prototype.solveRequest = function(rough) {
  this.solver = this.viewer.parametricManager.prepare([this.circle.r]);
  this.solver.solve(rough, 1);
  this.solver.sync();
};

TCAD.TWO.EditCircleTool.prototype.mouseup = function(e) {
  if (this.circle == null) {
    this.viewer.historyManager.checkpoint();
    var needSnap = this.viewer.snapped.length != 0;
    var p = needSnap ? this.viewer.snapped.pop() : this.viewer.screenToModel(e);
    this.circle = new TCAD.TWO.Circle(
      new TCAD.TWO.EndPoint(p.x, p.y)
    );
    if (needSnap) this.viewer.parametricManager.linkObjects([this.circle.c, p]);
    this.viewer.activeLayer().objects.push(this.circle);
    this.viewer.refresh();
  } else {
    this.solveRequest(false);
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
  }
};

TCAD.TWO.EditCircleTool.prototype.mousedown = function(e) {
};

TCAD.TWO.EditCircleTool.prototype.mousewheel = function(e) {
};
