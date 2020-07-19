import {TestMouseEvent} from './mouseEvent'
import Vector from 'math/vector';

export function toModel(ctx, x, y) {
  return ctx.viewer._screenToModel(x, y);
}

export function toModelP(ctx, point) {
  return ctx.viewer._screenToModel(point.x, point.y);
}

export function getConstraints(ctx) {
  return ctx.viewer.parametricManager.system.constraints;
}

export function click(ctx, point, attrs) {
  clickXY(ctx, point.x, point.y, attrs);
}

export function clickXY(ctx, x, y, attrs) {
  ctx.viewer.toolManager.tool.mousedown(new TestMouseEvent(x, y, 'mousedown', attrs));
  ctx.viewer.toolManager.tool.mouseup(new TestMouseEvent(x, y, 'mouseup', attrs));
}

export function moveAndClickXY(ctx, x, y, attrs) {
  ctx.viewer.toolManager.tool.mousemove(new TestMouseEvent(x, y, 'mousedown', attrs));
  clickXY(ctx, x, y, attrs);
}

export function move(ctx, from, to) {
  const toolManager = ctx.viewer.toolManager;
  toolManager.tool.mousedown(new TestMouseEvent(from.x, from.y));
  toolManager.tool.mousemove(new TestMouseEvent(to.x, to.y));
  toolManager.tool.mouseup(new TestMouseEvent(to.x, to.y));
}

export function moveInModel(ctx, fromX, fromY, toX, toY) {
  const toolManager = ctx.viewer.toolManager;
  [fromX, fromY] = modelToScreen(ctx.viewer, fromX, fromY);
  [toX, toY] = modelToScreen(ctx.viewer, toX, toY);

  toolManager.tool.mousemove(new TestMouseEvent(fromX, fromY));
  toolManager.tool.mousedown(new TestMouseEvent(fromX, fromY));
  toolManager.tool.mousemove(new TestMouseEvent(toX, toY));
  toolManager.tool.mouseup(new TestMouseEvent(toX, toY));
}


export function addSegment(ctx, aX, aY, bX, bY) {
  ctx.actions.SegmentTool.invoke(ctx);
  const tool = ctx.viewer.toolManager.tool;
  tool.mousemove(new TestMouseEvent(aX, aY));
  tool.mousedown(new TestMouseEvent(aX, aY));
  tool.mouseup(new TestMouseEvent(aX, aY));
  tool.mousemove(new TestMouseEvent(bX, bY));
  const segment = tool.line;
  tool.mouseup(new TestMouseEvent(bX, bY));
  ctx.viewer.toolManager.releaseControl();
  return segment;
}

export function addSegmentInModel(ctx, aX, aY, bX, bY) {
  
  [aX, aY] = modelToScreen(ctx.viewer, aX, aY);
  [bX, bY] = modelToScreen(ctx.viewer, bX, bY);

  return addSegment(ctx, aX, aY, bX, bY);
}

export function addArc(ctx, cX, cY, aX, aY, bX, bY) {

  [aX, aY] = modelToScreen(ctx.viewer, aX, aY);
  [bX, bY] = modelToScreen(ctx.viewer, bX, bY);
  [cX, cY] = modelToScreen(ctx.viewer, cX, cY);

  ctx.actions.ArcTool.invoke(ctx);

  moveAndClickXY(ctx, cX, cY);
  moveAndClickXY(ctx, aX, aY);
  let arc = ctx.viewer.toolManager.tool.arc;
  moveAndClickXY(ctx, bX, bY);
  ctx.viewer.toolManager.releaseControl();
  return arc;
}

export function addCircle(ctx, cX, cY, R) {
  let [rX, rY] = modelToScreen(ctx.viewer, cX + R, cY);
  [cX, cY] = modelToScreen(ctx.viewer, cX, cY);
  ctx.actions.CircleTool.invoke(ctx);
  moveAndClickXY(ctx, cX, cY);
  let circle = ctx.viewer.toolManager.tool.circle;
  moveAndClickXY(ctx, rX, rY);
  ctx.viewer.toolManager.releaseControl();
  return circle;
}

export function addEllipse(ctx, aX, aY, bX, bY, rX, rY) {
  [aX, aY] = modelToScreen(ctx.viewer, aX, aY);
  [bX, bY] = modelToScreen(ctx.viewer, bX, bY);
  [rX, rY] = modelToScreen(ctx.viewer, rX, rY);
  ctx.actions.EllipseTool.invoke(ctx);
  moveAndClickXY(ctx, aX, aY);
  let ellipse = ctx.viewer.toolManager.tool.ellipse;
  moveAndClickXY(ctx, bX, bY);
  moveAndClickXY(ctx, rX, rY);
  ctx.viewer.toolManager.releaseControl();
  return ellipse;
}

export function addEllipticalArc(ctx, aX, aY, bX, bY, rX, rY) {
  [aX, aY] = modelToScreen(ctx.viewer, aX, aY);
  [bX, bY] = modelToScreen(ctx.viewer, bX, bY);
  [rX, rY] = modelToScreen(ctx.viewer, rX, rY);
  ctx.actions.EllipseArcTool.invoke(ctx);
  moveAndClickXY(ctx, aX, aY);
  let ellipse = ctx.viewer.toolManager.tool.ellipse;
  moveAndClickXY(ctx, bX, bY);
  moveAndClickXY(ctx, rX, rY);
  ctx.viewer.toolManager.releaseControl();
  return ellipse;
}

export function addBezier(ctx, aX, aY, bX, bY) {
  [aX, aY] = modelToScreen(ctx.viewer, aX, aY);
  [bX, bY] = modelToScreen(ctx.viewer, bX, bY);
  ctx.actions.BezierTool.invoke(ctx);
  moveAndClickXY(ctx, aX, aY);
  let curve = ctx.viewer.toolManager.tool.curve;
  moveAndClickXY(ctx, bX, bY);
  ctx.viewer.toolManager.releaseControl();
  return curve;
}

export function polyLine(ctx) {
  ctx.actions['addMultiSegment'].action();
  const tool = ctx.viewer.toolManager.tool;
  for (let i = 1; i < arguments.length; ++i) {
    let p = arguments[i];
    tool.mousemove(new TestMouseEvent(p.x, p.y));
    tool.mousedown(new TestMouseEvent(p.x, p.y));
    tool.mouseup(new TestMouseEvent(p.x, p.y));
  }
  tool.cancelSegment();
  ctx.viewer.toolManager.releaseControl();
}


export function segmentAsVector(segment) {
  return new Vector(segment.b.x - segment.a.x, segment.b.y - segment.a.y);
}

export class TestSegment {
  constructor(aX, aY, bX, bY) {
    this.a = new Vector(aX, aY);
    this.b = new Vector(bX, bY);
    this.v = this.b.minus(this.a);
  }
  
  middle() {
    const half = this.v.multiply(0.5);
    return this.a.plus(half);
  }
  
  add(ctx) {
    return addSegment(ctx, this.a.x, this.a.y, this.b.x, this.b.y);
  }
}

export function modelToScreen(viewer, x, y) {
  if (viewer.screenToModelMatrix) {
    let modelToScreenMx = viewer.screenToModelMatrix.invert();
    [x, y] = modelToScreenMx.apply3([x, y, 0]);
  }
  x /= viewer.retinaPxielRatio;
  y = (viewer.canvas.height - y) / viewer.retinaPxielRatio;
  return [x, y];
}