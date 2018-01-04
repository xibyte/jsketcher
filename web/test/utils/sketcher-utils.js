import {TestMouseEvent} from './mouse-event'
import Vector from 'math/vector';

export function toModel(app, x, y) {
  return app.viewer._screenToModel(x, y);
}

export function toModelP(app, point) {
  return app.viewer._screenToModel(point.x, point.y);
}

export function getConstraints(app) {
  const subSystems = app.viewer.parametricManager.subSystems;
  if (subSystems.length == 0) {
    return [];
  }
  return subSystems[0].constraints;
}

export function click(app, point, attrs) {
  clickXY(app, point.x, point.y, attrs);
}

export function clickXY(app, x, y, attrs) {
  app.viewer.toolManager.tool.mousedown(new TestMouseEvent(x, y, 'mousedown', attrs));
  app.viewer.toolManager.tool.mouseup(new TestMouseEvent(x, y, 'mouseup', attrs));
}

export function move(app, from, to) {
  const toolManager = app.viewer.toolManager;
  toolManager.tool.mousedown(new TestMouseEvent(from.x, from.y));
  toolManager.tool.mousemove(new TestMouseEvent(to.x, to.y));
  toolManager.tool.mouseup(new TestMouseEvent(to.x, to.y));
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