export class ToolManager {
  
  constructor(viewer, defaultTool) {
    this.defaultTool = defaultTool;
    this.tool = defaultTool;
    this.viewer = viewer;
    const canvas = viewer.canvas;
    canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
      //e.stopPropagation(); // allow propagation for move in sake of dynamic layout 
      this.tool.mousemove(e);
    }, false);
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.tool.mousedown(e);
    }, false);
    canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.tool.mouseup(e);
    }, false);
    canvas.addEventListener('mousewheel', (e) => {
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

    window.addEventListener("keydown", (e) => {
      this.tool.keydown(e);
      if (e.keyCode == 27) {
        this.releaseControl();
      } else if (e.keyCode == 46 || e.keyCode == 8) {
        var selection = viewer.selected.slice();
        viewer.deselectAll();
        for (var i = 0; i < selection.length; i++) {
          viewer.remove(selection[i]);
        }
        viewer.refresh();
      }
    }, false);
    window.addEventListener("keypress", (e) => {
      this.tool.keydown(e);
    }, false);
    window.addEventListener("keyup", (e) => {
      this.tool.keydown(e);
    }, false);
  }

  takeControl(tool) {
    this.tool = tool;
    this.viewer.bus.notify("tool-change");
    this.tool.restart();
  }

  releaseControl() {
    this.tool.cleanup();
    this.takeControl(this.defaultTool);
  }
}