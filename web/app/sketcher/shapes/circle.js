import * as utils from '../../utils/utils';
import * as math from '../../math/math';
import {EditCircleTool} from '../tools/circle'

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


export {Circle}