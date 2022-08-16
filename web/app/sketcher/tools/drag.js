import {Tool} from './tool'
import {toast} from "react-toastify";
import {distance} from "math/distance";

export class DragTool extends Tool {
  
  constructor(obj, viewer) {
    super('drag', viewer);
    this.obj = obj;
    this._point = {x: 0, y: 0};
    this.origin = {x: 0, y: 0};
    this.solver = null;
  }
  
  mousemove(e) {
    if (this.generatedCaptured) {
      toast("You cannot drag generated object. To move them, drag the objects they are generated off of ")
      this.viewer.toolManager.releaseControl();
      return;
    }
    const x = this._point.x;
    const y = this._point.y;
    this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
    const dx = this._point.x - x;
    const dy = this._point.y - y;
    if (this.obj.drag) {
      this.obj.drag(this._point.x, this._point.y, dx, dy);
    } else {
      this.obj.translate(dx, dy);
    }
    // this.viewer.parametricManager.setConstantsFromGeometry(this.obj);
    if (!Tool.dumbMode(e) && this.obj.constraints.length !== 0) {
      // this.viewer.parametricManager.prepare();
      this.viewer.parametricManager.solve(true);
    }
    this.viewer.refresh();
  }

  mousedown(e) {
    this.generatedCaptured = this.obj.isGenerated;
    if (this.generatedCaptured) {
      return;
    }
    this.origin.x = e.offsetX;
    this.origin.y = e.offsetY;
    this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
    if (this.obj.constraints.length !== 0) {
      this.viewer.parametricManager.algNumSystem.controlBounds = true;
      this.viewer.parametricManager.prepare([this.obj]);
    }
  }

  mouseup(e) {
    if (this.generatedCaptured) {
      this.viewer.toolManager.releaseControl();
      return;
    }

    if (this.obj.constraints.length !== 0) {
      this.viewer.parametricManager.solve(false);
      this.viewer.parametricManager.algNumSystem.controlBounds = false;
    }
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
    const traveled = distance(this.origin.x, this.origin.y, e.offsetX, e.offsetY);
    if (traveled >= 10) {
      this.viewer.historyManager.lightCheckpoint(10);
    }
  }

  mousewheel(e) {
  }

}
