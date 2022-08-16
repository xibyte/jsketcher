import {Tool} from './tool'
import {Circle} from '../shapes/circle'
import {distance} from "math/distance";

export class EditCircleTool extends Tool {
  constructor(viewer) {
    super('circle', viewer);
    this.circle = null;
  }

  restart() {
    this.sendMessage('specify center');
  }

  cleanup(e) {
    this.viewer.cleanSnap();
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    if (this.circle != null) {
      const r = distance(p.x, p.y, this.circle.c.x, this.circle.c.y);
      this.circle.r.set(r);
      if (!Tool.dumbMode(e)) {
        this.solveRequest(true);
      }
    } else {
      this.viewer.snap(p.x, p.y, []);
    }
    this.viewer.refresh();
  }

  solveRequest(rough) {
    this.viewer.parametricManager.solve(rough);
  }

  mouseup(e) {
    if (this.circle == null) {
      this.stepCreateCircle(this.viewer.screenToModel(e), true);
    } else {
      this.stepFinish();
    }
  }

  stepCreateCircle(center, tryToSnap) {
    this.viewer.historyManager.checkpoint();
    const needSnap = tryToSnap && this.viewer.snapped != null;
    const p = needSnap ? this.viewer.snapped : center;
    this.circle = new Circle(p.x, p.y);
    this.pointPicked(this.circle.c.x, this.circle.c.y);
    this.sendHint('specify radius');
    this.viewer.activeLayer.add(this.circle);
    this.viewer.parametricManager.prepare([this.circle]);
    if (needSnap) this.viewer.parametricManager.coincidePoints(this.circle.c, p);
    this.viewer.refresh();
  }

  stepFinish() {
    this.solveRequest(false);
    this.sendMessage("radius: " + this.viewer.roundToPrecision(this.circle.r.get()));
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
  }

  processCommand(command) {
    if (this.circle == null) {
      const result = Tool.ParseVector(this.viewer.referencePoint, command);
      if(typeof result === 'string') return result;
      this.stepCreateCircle(result, false)
    } else {
      const result = Tool.ParseNumber(command);
      if(typeof result === 'string') return result;
      this.circle.r.set(result);
      this.stepFinish();
    }
  }
}
