import {Tool} from './tool'

export class EllipseEditTool extends Tool {

  constructor(viewer, ellipse) {
    super('edit ellipse', viewer);
    this.ellipse = ellipse;
  }
  
  restart() {
    // this.sendHint('specify a center of the ellipse')
  }

  cleanup(e) {
  }

  mousedown(e) {
    const p = this.viewer.screenToModel(e);

    const dx = p.x - this.ellipse.c.x;
    const dy = p.y - this.ellipse.c.y;

    this.dRot = this.ellipse.rot.get() - Math.atan2(dy, dx);

  }

  mouseup(e) {
    this.solveRequest(false);
    this.viewer.toolManager.releaseControl();
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);

    const dx = p.x - this.ellipse.c.x;
    const dy = p.y - this.ellipse.c.y;

    const rot = Math.atan2(dy, dx);

    const ellRot = this.dRot + rot;
    this.ellipse.rot.set(ellRot);

    const eAng = - this.dRot;
    const rm = (eAng + 10 * Math.PI) % Math.PI;

    if (rm > Math.PI / 4 && rm < 3/4*Math.PI) {
      const axisX = - Math.sin(ellRot);
      const axisY =   Math.cos(ellRot);
      this.ellipse.ry.set(Math.abs(dx * axisX + dy * axisY))
    } else {
      const axisX =   Math.cos(ellRot);
      const axisY =   Math.sin(ellRot);
      this.ellipse.rx.set(Math.abs(dx * axisX + dy * axisY))
    }

    if (!Tool.dumbMode(e)) {
      this.solveRequest(true);
    }

    this.viewer.refresh();
  }

  solveRequest(rough) {
    this.viewer.parametricManager.prepare([{
      visitParams: (cb) => {
        cb(this.ellipse.rx);
        cb(this.ellipse.ry);
      }
    }]);
    this.viewer.parametricManager.solve(rough);
  }

}