import {TestMouseEvent} from './mouse-event'

export function toModel(app, x, y) {
  return app.viewer._screenToModel(x, y);
}

export function toModelP(app, point) {
  return app.viewer._screenToModel(point.x, point.y);
}

export function getConstraints(app) {
  return app.viewer.parametricManager.subSystems[0].constraints;
}

export function click(tool, x, y) {
  tool.mousedown(new TestMouseEvent(x, y));
  tool.mouseup(new TestMouseEvent(x, y));
}

export function move(app, from, to) {
  const toolManager = app.viewer.toolManager;
  toolManager.tool.mousedown(new TestMouseEvent(from.x, from.y));
  toolManager.tool.mousemove(new TestMouseEvent(to.x, to.y));
  toolManager.tool.mouseup(new TestMouseEvent(to.x, to.y));
}
