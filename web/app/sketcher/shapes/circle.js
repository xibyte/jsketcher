import * as utils from '../../utils/utils';
import * as math from '../../math/math';
import {SketchObject, EndPoint, Ref} from '../viewer2d'

/** @constructor */
function Circle(c) {
  SketchObject.call(this);
  this.c = c;
  c.parent = this;
  this.children.push(c);
  this.r = new Ref(0);
  this.r.obj = this;
}

utils.extend(Circle, SketchObject);

Circle.prototype._class = 'TCAD.TWO.Circle';

Circle.prototype.collectParams = function(params) {
  this.c.collectParams(params);
  params.push(this.r);
};

Circle.prototype.getReferencePoint = function() {
  return this.c;
};

Circle.prototype.translateImpl = function(dx, dy) {
  this.c.translate(dx, dy);
};

Circle.prototype.drawImpl = function(ctx, scale) {
  ctx.beginPath();
  ctx.arc(this.c.x, this.c.y, this.r.get(), 0, 2 * Math.PI);
  ctx.stroke();
};

Circle.prototype.normalDistance = function(aim) {
  return Math.abs(math.distance(aim.x, aim.y, this.c.x, this.c.y) - this.r.get());
};

Circle.prototype.getDefaultTool = function(viewer) {
  var editTool = new EditCircleTool(viewer, null);
  editTool.circle = this;
  return editTool;
};

/** @constructor */
function EditCircleTool(viewer) {
  this.viewer = viewer;
  this.circle = null;
}

EditCircleTool.prototype.keydown = function(e) {};
EditCircleTool.prototype.keypress = function(e) {};
EditCircleTool.prototype.keyup = function(e) {};

EditCircleTool.prototype.cleanup = function(e) {
  this.viewer.cleanSnap();
};

EditCircleTool.prototype.mousemove = function(e) {
  var p = this.viewer.screenToModel(e);
  if (this.circle != null) {
    var r = math.distance(p.x, p.y, this.circle.c.x, this.circle.c.y);
    this.circle.r.set(r);
    if (!e.shiftKey) {
      this.solveRequest(true);
    }
  } else {
    this.viewer.snap(p.x, p.y, []);
  }
  this.viewer.refresh();
};

EditCircleTool.prototype.solveRequest = function(rough) {
  this.solver = this.viewer.parametricManager.prepare([this.circle.r]);
  this.solver.solve(rough, 1);
  this.solver.sync();
};

EditCircleTool.prototype.mouseup = function(e) {
  if (this.circle == null) {
    this.viewer.historyManager.checkpoint();
    var needSnap = this.viewer.snapped.length != 0;
    var p = needSnap ? this.viewer.snapped.pop() : this.viewer.screenToModel(e);
    this.circle = new Circle(
      new EndPoint(p.x, p.y)
    );
    if (needSnap) this.viewer.parametricManager.linkObjects([this.circle.c, p]);
    this.viewer.activeLayer.objects.push(this.circle);
    this.viewer.refresh();
  } else {
    this.solveRequest(false);
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
  }
};

EditCircleTool.prototype.mousedown = function(e) {
};

EditCircleTool.prototype.mousewheel = function(e) {
};

export {Circle, EditCircleTool}