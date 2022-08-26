import {Tool} from './tool'
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";

export class AddSegmentTool extends Tool {

  constructor(viewer, multi) {
    super(multi ? "multi line" : "line", viewer);
    this.line = null;
    this.multi = multi;
  }

  restart() {
    this.line = null;
    this.sendHint('specify the first point')
  }

  cleanup() {
    this.viewer.cleanSnap();
    this.line = null;
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    if (this.line != null) {
      this.viewer.snap(p.x, p.y, [this.line.a, this.line.b]);
      this.line.b.x = p.x;
      this.line.b.y = p.y;
      this.viewer.refresh();
    } else {
      this.viewer.snap(p.x, p.y, []);
      this.viewer.refresh();
    }
  }
  
  mouseup(e) {
    const snapped = this.viewer.snapped != null;
    if (this.line == null) {
      const b = this.viewer.screenToModel(e);
      let a = b;
      let needSnap = false;
      if (snapped) {
        a = this.viewer.snapped;
        this.viewer.cleanSnap();
        needSnap = true;
      }
      this.line = this.viewer.addSegment(a.x, a.y, b.x, b.y, this.viewer.activeLayer);
      if (needSnap) {
        this.viewer.parametricManager.coincidePoints(this.line.a, a);
      } else {
        // this.viewer.parametricManager.lockPoint(this.line.a);
      }
      this.firstPointPicked();
      this.viewer.refresh();
    } else {
      if (snapped) {
        const p = this.viewer.snapped;
        this.viewer.cleanSnap();
        this.line.b.x = p.x;
        this.line.b.y = p.y;
        this.viewer.parametricManager.coincidePoints(this.line.b, p);
      }
      this.nextPointPicked(snapped);
    }
  }
  
  nextPointPicked(snapped) {
    this.pointPicked(this.line.b.x, this.line.b.y);
    this.line.stabilize(this.viewer);
    if (!snapped) {
      // this.viewer.parametricManager.lockAngle(this.line);
      // this.viewer.parametricManager.lockLength(this.line);
    }
    if (this.multi) {
      const b = this.line.b;
      this.line = this.viewer.addSegment(b.x, b.y, b.x, b.y, this.viewer.activeLayer);
      this.viewer.parametricManager.coincidePoints(this.line.a, b);
    } else {
      this.restart()
    }
    if (this.multi) {
      this.sendHint('specify next point');
    }
    this.viewer.refresh();
  }

  firstPointPicked() {
    this.pointPicked(this.line.a.x, this.line.a.y);
    this.sendHint('specify ' + (this.multi ? 'next' : 'end') +' geom.point');
  }

  dblclick(e) {
    this.cancelSegment();
  }

  keydown(e) {
    if (e.keyCode === 27) {
      this.cancelSegment();
    }
  }

  cancelSegment() {
    if (this.multi && this.line != null) {
      this.viewer.remove(this.line);
      this.viewer.refresh();
      this.cleanup(null);
    }
  }

  processCommand(command) {
    const result = Tool.ParseVector(this.viewer.referencePoint, command);
    if(typeof result === 'string') {
      return result;
    }
    const p = result;
    if (this.line == null) {
      this.line = this.viewer.addSegment(p.x, p.y, p.x, p.y, this.viewer.activeLayer);
      this.firstPointPicked();
    } else {
      this.line.b.x = p.x;
      this.line.b.y = p.y;
      this.nextPointPicked();
      
    }
    this.viewer.refresh();
  }
}

