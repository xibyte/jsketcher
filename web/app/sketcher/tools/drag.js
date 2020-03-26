import {Tool} from './tool'
import {optim} from '../../math/optim'
import * as math from '../../math/math'
import {toast} from "react-toastify";

export class DragTool extends Tool {
  
  constructor(obj, viewer) {
    super('drag', viewer);
    this.obj = obj;
    this._point = {x: 0, y: 0};
    this.origin = {x: 0, y: 0};
    this.solver = null;
  }
  
  mousemove(e) {
    let x = this._point.x;
    let y = this._point.y;
    this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
    let dx = this._point.x - x;
    let dy = this._point.y - y;
    // for (let i = 0; i < this.lockedShifts.length; i += 2) {
    //   this.lockedValues[i] = this._point.x - this.lockedShifts[i];
    //   this.lockedValues[i + 1] = this._point.y - this.lockedShifts[i + 1];
    // }

    this.obj.translate(dx, dy);
    // this.viewer.parametricManager.setConstantsFromGeometry(this.obj);
    if (!Tool.dumbMode(e) || this.obj.constraints.length !== 0) {
      // this.viewer.parametricManager.prepare();
      this.viewer.parametricManager.solve(true);
    }
    this.viewer.refresh();
  }

  mousedown(e) {
    if (this.obj.isGenerated) {
      toast("You cannot drag generated object. To move them, drag the objects they are generated off of ")
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
    this.viewer.parametricManager.solve(false);
    this.viewer.refresh();
    this.viewer.parametricManager.algNumSystem.controlBounds = false;
    this.viewer.toolManager.releaseControl();
    let traveled = math.distance(this.origin.x, this.origin.y, e.offsetX, e.offsetY);
    if (traveled >= 10) {
      this.viewer.historyManager.lightCheckpoint(10);
    }
    //this.animateSolution();
  }

  mousewheel(e) {
  }

}
