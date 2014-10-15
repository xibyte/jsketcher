
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


TCAD.TWO.EditCircleTool = function(viewer, layer) {
  this.viewer = viewer;
  this.layer = layer;
  this.circle = null;
};

TCAD.TWO.EditCircleTool.prototype.mousemove = function(e) {
  if (this.circle != null) {
    var p = this.viewer.screenToModel(e);
    var r = TCAD.math.distance(p.x, p.y, this.circle.c.x, this.circle.c.y);
    this.circle.r.set(r);
    this.viewer.refresh();
  }
};

TCAD.TWO.EditCircleTool.prototype.mouseup = function(e) {
  if (this.circle == null) {
    var p = this.viewer.screenToModel(e);
    this.circle = new TCAD.TWO.Circle(
      new TCAD.TWO.EndPoint(p.x, p.y)
    );
    this.layer.objects.push(this.circle);
    this.viewer.refresh();
  } else {
    this.viewer.toolManager.releaseControl();
  }
};

TCAD.TWO.EditCircleTool.prototype.mousedown = function(e) {
};

TCAD.TWO.EditCircleTool.prototype.mousewheel = function(e) {
};
