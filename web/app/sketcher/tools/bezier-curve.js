import {Tool} from './tool'
import {BezierCurve} from '../shapes/bezier-curve'
import Vector from 'math/vector';
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {rotate} from "geom/euclidean";

export class BezierCurveTool extends Tool {

  constructor(viewer) {
    super('bezier curve', viewer);
    this.init();
    this._v = new Vector();
  }
  
  init() {
    this.curve = null;
    this.otherCurveEndPoint = null;
  }
  
  restart() {
    this.init();
    this.sendHint('specify first point')
  }

  cleanup(e) {
    this.viewer.cleanSnap();
  }
  
  mouseup(e) {
    if (this.curve == null) {
      this.checkIfConnectedToOtherCurve();

      const p = this.viewer.screenToModel(e);

      this.curve = new BezierCurve(p.x, p.y, p.x, p.y, p.x, p.y, p.x, p.y);
      if (this.viewer.snapped != null) {
        this.snapIfNeed(this.curve.a);
      }

      this.viewer.activeLayer.add(this.curve);
      this.viewer.refresh();
    } else {
      this.viewer.parametricManager.startTransaction();
      this.snapIfNeed(this.curve.b);
      if (this.otherCurveEndPoint != null) {
        const smoothingConstr = new AlgNumConstraint(ConstraintDefinitions.Parallel, [this.otherCurveEndPoint.parent, this.curve.a.parent]);
        smoothingConstr.initConstants();
        this.viewer.parametricManager.add(smoothingConstr);
      }
      this.curve.stabilize(this.viewer);
      this.viewer.parametricManager.finishTransaction();
      this.viewer.toolManager.releaseControl();
    }
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    if (this.curve != null) {
      this.curve.b.setFromPoint(p);
      const axis = this._v.set(this.curve.b.x - this.curve.a.x, this.curve.b.y - this.curve.a.y)._multiply(0.7);
      //controlSegment = {x: -controlSegment.y, y: controlSegment.x};
      const controlSegment = rotate(- axis.y, axis.x, - Math.PI * 0.25);
      if (this.otherCurveEndPoint != null) {
        const ctrlLength = axis.length();
        this.curve.cp1.x = this.curve.a.x + this.snappedControl.x * ctrlLength;
        this.curve.cp1.y = this.curve.a.y + this.snappedControl.y * ctrlLength;
        if (this.snappedControl.x * controlSegment.x  + this.snappedControl.y * controlSegment.y < 0) {
          controlSegment.x *= -1;
          controlSegment.y *= -1;
        }
      } else {
        this.curve.cp1.x = this.curve.a.x + controlSegment.x;
        this.curve.cp1.y = this.curve.a.y + controlSegment.y;
      }
      this.curve.cp2.x = this.curve.b.x - controlSegment.x;
      this.curve.cp2.y = this.curve.b.y - controlSegment.y;
      this.viewer.snap(p.x, p.y, [this.curve.a, this.curve.b, this.curve.cp1, this.curve.cp2]);
    } else {
      this.viewer.snap(p.x, p.y, []);
    }
    this.viewer.refresh();
  }

  checkIfConnectedToOtherCurve() {
    const snapped = this.viewer.snapped;
    if (snapped != null && snapped.parent && snapped.parent.parent && 
      snapped.parent.parent instanceof BezierCurve && 
      snapped.parent.a === snapped) { //only a of Segment is a curve endpoint(other end is a control point) 
      const seg = snapped.parent;
      this.otherCurveEndPoint = snapped;
      this.snappedControl = new Vector(seg.b.x - seg.a.x, seg.b.y - seg.a.y)._normalize()._multiply(-1);
    }
  }
}