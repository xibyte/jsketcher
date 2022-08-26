export class ToolManager {
  
  constructor(viewer, defaultTool) {
    this.defaultTool = defaultTool;
    this.tool = defaultTool;
    this.viewer = viewer;
    this.disposers = [];
    const canvas = viewer.canvas
    viewer.canvas.setAttribute('tabindex','0'); // makes it focusable
    canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
      //e.stopPropagation(); // allow propagation for move in sake of dynamic layout 
      this.tool.mousemove(e);
    }, false);
    canvas.addEventListener('mousedown', (e) => {
      canvas.focus();
      e.preventDefault();
      e.stopPropagation();
      this.tool.mousedown(e);
    }, false);
    canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      // e.stopPropagation(); // allow propagation for move in sake of dynamic layout
      this.tool.mouseup(e);
    }, false);
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, false);
    window.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      let tool = this.tool;
      if (tool.mousewheel === undefined) {
        tool = this.defaultTool;
      }
      if (tool.mousewheel !== undefined) {
        tool.mousewheel(e)
      }
    }, false);
    canvas.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.tool.dblclick(e);
    }, false);

    this.addEventListener(canvas, "keydown", (e) => {
      this.tool.keydown(e);
      if (e.keyCode === 27) {
        this.releaseControl();
      } else if (e.keyCode === 46 || e.keyCode === 8) {
        const selection = viewer.selected.slice();
        viewer.removeAll(selection);
        viewer.refresh();
      }
    }, false);
    this.addEventListener(canvas, "keypress", (e) => {
      this.tool.keydown(e);
    }, false);
    this.addEventListener(canvas, "keyup", (e) => {
      this.tool.keydown(e);
    }, false);
  }

  setDefaultTool(defaultTool) {
    this.defaultTool = defaultTool;
    this.tool = defaultTool;
  }

  addEventListener(subject, event, fn, useCapture) {
    subject.addEventListener(event, fn, useCapture);
    this.disposers.push(() => subject.removeEventListener(event, fn, useCapture));
  }
  
  takeControl(tool) {
    this.tool.cleanup();
    this.switchTool(tool);
    this.tool.restart();
  }

  switchTool(tool) {
    this.tool = tool;
    this.viewer.streams.tool.$change.next(tool);
  }

  releaseControl() {
    this.takeControl(this.defaultTool);
  }
  
  dispose() {
    this.disposers.forEach(d => d());
  }
}