import {TestMouseEvent} from './mouseEvent'
import Vector from 'math/vector';

export function toModel(app, x, y) {
  return app.viewer._screenToModel(x, y);
}

export function toModelP(app, point) {
  return app.viewer._screenToModel(point.x, point.y);
}

export function getConstraints(app) {
  return app.viewer.parametricManager.system.constraints;
}

export function click(app, point, attrs) {
  clickXY(app, point.x, point.y, attrs);
}

export function clickXY(app, x, y, attrs) {
  app.viewer.toolManager.tool.mousedown(new TestMouseEvent(x, y, 'mousedown', attrs));
  app.viewer.toolManager.tool.mouseup(new TestMouseEvent(x, y, 'mouseup', attrs));
}

export function moveAndClickXY(app, x, y, attrs) {
  app.viewer.toolManager.tool.mousemove(new TestMouseEvent(x, y, 'mousedown', attrs));
  clickXY(app, x, y, attrs);
}

export function move(app, from, to) {
  const toolManager = app.viewer.toolManager;
  toolManager.tool.mousedown(new TestMouseEvent(from.x, from.y));
  toolManager.tool.mousemove(new TestMouseEvent(to.x, to.y));
  toolManager.tool.mouseup(new TestMouseEvent(to.x, to.y));
}

export function moveInModel(app, fromX, fromY, toX, toY) {
  const toolManager = app.viewer.toolManager;
  [fromX, fromY] = modelToScreen(app.viewer, fromX, fromY);
  [toX, toY] = modelToScreen(app.viewer, toX, toY);

  toolManager.tool.mousemove(new TestMouseEvent(fromX, fromY));
  toolManager.tool.mousedown(new TestMouseEvent(fromX, fromY));
  toolManager.tool.mousemove(new TestMouseEvent(toX, toY));
  toolManager.tool.mouseup(new TestMouseEvent(toX, toY));
}


export function addSegment(app, aX, aY, bX, bY) {
  app.actions['addSegment'].action();
  const tool = app.viewer.toolManager.tool;
  tool.mousemove(new TestMouseEvent(aX, aY));
  tool.mousedown(new TestMouseEvent(aX, aY));
  tool.mouseup(new TestMouseEvent(aX, aY));
  tool.mousemove(new TestMouseEvent(bX, bY));
  const segment = tool.line;
  tool.mouseup(new TestMouseEvent(bX, bY));
  app.viewer.toolManager.releaseControl();
  return segment;
}

export function addSegmentInModel(app, aX, aY, bX, bY) {
  
  [aX, aY] = modelToScreen(app.viewer, aX, aY);
  [bX, bY] = modelToScreen(app.viewer, bX, bY);

  return addSegment(app, aX, aY, bX, bY);
}

export function addArc(app, cX, cY, aX, aY, bX, bY) {

  [aX, aY] = modelToScreen(app.viewer, aX, aY);
  [bX, bY] = modelToScreen(app.viewer, bX, bY);
  [cX, cY] = modelToScreen(app.viewer, cX, cY);

  app.actions['addArc'].action();

  moveAndClickXY(app, cX, cY);
  moveAndClickXY(app, aX, aY);
  let arc = app.viewer.toolManager.tool.arc;
  moveAndClickXY(app, bX, bY);
  app.viewer.toolManager.releaseControl();
  return arc;
}

export function addCircle(app, cX, cY, R) {
  let [rX, rY] = modelToScreen(app.viewer, cX + R, cY);
  [cX, cY] = modelToScreen(app.viewer, cX, cY);
  app.actions['addCircle'].action();
  moveAndClickXY(app, cX, cY);
  let circle = app.viewer.toolManager.tool.circle;
  moveAndClickXY(app, rX, rY);
  app.viewer.toolManager.releaseControl();
  return circle;
}

export function addEllipse(app, aX, aY, bX, bY, rX, rY) {
  [aX, aY] = modelToScreen(app.viewer, aX, aY);
  [bX, bY] = modelToScreen(app.viewer, bX, bY);
  [rX, rY] = modelToScreen(app.viewer, rX, rY);
  app.actions['addEllipse'].action();
  moveAndClickXY(app, aX, aY);
  let ellipse = app.viewer.toolManager.tool.ellipse;
  moveAndClickXY(app, bX, bY);
  moveAndClickXY(app, rX, rY);
  app.viewer.toolManager.releaseControl();
  return ellipse;
}

export function addEllipticalArc(app, aX, aY, bX, bY, rX, rY) {
  [aX, aY] = modelToScreen(app.viewer, aX, aY);
  [bX, bY] = modelToScreen(app.viewer, bX, bY);
  [rX, rY] = modelToScreen(app.viewer, rX, rY);
  app.actions['addEllipticalArc'].action();
  moveAndClickXY(app, aX, aY);
  let ellipse = app.viewer.toolManager.tool.ellipse;
  moveAndClickXY(app, bX, bY);
  moveAndClickXY(app, rX, rY);
  app.viewer.toolManager.releaseControl();
  return ellipse;
}

export function addBezier(app, aX, aY, bX, bY) {
  [aX, aY] = modelToScreen(app.viewer, aX, aY);
  [bX, bY] = modelToScreen(app.viewer, bX, bY);
  app.actions['addBezierCurve'].action();
  moveAndClickXY(app, aX, aY);
  let curve = app.viewer.toolManager.tool.curve;
  moveAndClickXY(app, bX, bY);
  app.viewer.toolManager.releaseControl();
  return curve;
}

export function polyLine(app) {
  app.actions['addMultiSegment'].action();
  const tool = app.viewer.toolManager.tool;
  for (let i = 1; i < arguments.length; ++i) {
    let p = arguments[i];
    tool.mousemove(new TestMouseEvent(p.x, p.y));
    tool.mousedown(new TestMouseEvent(p.x, p.y));
    tool.mouseup(new TestMouseEvent(p.x, p.y));
  }
  tool.cancelSegment();
  app.viewer.toolManager.releaseControl();
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
  
  add(app) {
    return addSegment(app, this.a.x, this.a.y, this.b.x, this.b.y);
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
