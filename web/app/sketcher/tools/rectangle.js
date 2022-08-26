import {Tool} from './tool'
import {EndPoint} from '../shapes/point'
import {Segment} from '../shapes/segment'
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";


export class RectangleTool extends Tool {
  constructor(viewer) {
    super('rectangle', viewer);
    this.rectangle = null;
    this.firstPointSnap = null;
    this.snapExclude = [];
  }

  restart() {
    this.sendMessage('specify first point');
  }

  cleanup(e) {
    this.viewer.cleanSnap();
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    if (this.rectangle != null) {
      this.alignSegments(p);
      this.viewer.snap(p.x, p.y, this.snapExclude);
    } else {
      this.viewer.snap(p.x, p.y, []);
    }
    this.viewer.refresh();
  }

  mouseup(e) {
    if (this.rectangle == null) {
      let p;
      if (this.viewer.snapped != null) {
        this.firstPointSnap = this.viewer.snapped;
        p = this.firstPointSnap;
        this.viewer.cleanSnap();
      } else {
        p = this.viewer.screenToModel(e);
      }
      this.createRectangle(p);
    } else {
      let p = this.viewer.snapped;
      if (this.viewer.snapped != null) {
        p = this.viewer.snapped;
      } else {
        p = this.viewer.screenToModel(e);
      }
      this.alignSegments(p);
      
      if (this.viewer.snapped != null) {
        this.viewer.parametricManager.coincidePoints(this.rectangle[2].a, this.viewer.snapped);
      }
      if (this.firstPointSnap != null) {
        this.viewer.parametricManager.coincidePoints(this.rectangle[0].a, this.firstPointSnap);
      }
      
      this.viewer.cleanSnap();
      this.stepFinish(p);
    }
  }

  createRectangle(v) {
    //from top, clockwise
    this.rectangle = [
      new Segment(v.x, v.y, v.x, v.y),
      new Segment(v.x, v.y, v.x, v.y),
      new Segment(v.x, v.y, v.x, v.y),
      new Segment(v.x, v.y, v.x, v.y)
    ];
    for (const s of this.rectangle) {
      this.viewer.activeLayer.add(s);
      this.snapExclude.push(s.a, s.b);
    }
    this.pointPicked(v.x, v.y);
    this.viewer.refresh();
  }
  
  alignSegments(p) {
    this.rectangle[0].b.x = p.x;
    this.rectangle[1].a.x = p.x;
    this.rectangle[1].b.setFromPoint(p);
    this.rectangle[2].a.setFromPoint(p);
    this.rectangle[2].b.y = p.y;
    this.rectangle[3].a.y = p.y;
  }

  stepFinish(p) {
    this.pointPicked(p.x, p.y);
    const pm = this.viewer.parametricManager;
    pm.startTransaction();
    pm.coincidePoints(this.rectangle[3].b, this.rectangle[0].a);
    pm.coincidePoints(this.rectangle[0].b, this.rectangle[1].a);
    pm.coincidePoints(this.rectangle[1].b, this.rectangle[2].a);
    pm.coincidePoints(this.rectangle[2].b, this.rectangle[3].a);

    this.rectangle.forEach(seg => seg.syncGeometry());

    const constraints = [
      new AlgNumConstraint(ConstraintDefinitions.Horizontal, [this.rectangle[0]], {angle: ConstraintDefinitions.Horizontal.constants.angle.initialValue([this.rectangle[0]])}),
      new AlgNumConstraint(ConstraintDefinitions.Horizontal, [this.rectangle[2]], {angle: ConstraintDefinitions.Horizontal.constants.angle.initialValue([this.rectangle[2]])}),
      new AlgNumConstraint(ConstraintDefinitions.Vertical, [this.rectangle[3]], {angle: ConstraintDefinitions.Vertical.constants.angle.initialValue([this.rectangle[3]])}),
      new AlgNumConstraint(ConstraintDefinitions.Vertical, [this.rectangle[1]], {angle: ConstraintDefinitions.Vertical.constants.angle.initialValue([this.rectangle[1]])}),
    ];
    // constraints.forEach(c => c.initConstants());
    this.rectangle.forEach(s => s.stabilize(this.viewer));
    pm.addAll(constraints);
    pm.finishTransaction();
    this.viewer.toolManager.releaseControl();
  }

  processCommand(command) {
    const result = Tool.ParseVector(this.viewer.referencePoint, command);
    if(typeof result === 'string') return result;
    if (this.rectangle == null) {
      this.createRectangle(result)
    } else {
      this.alignSegments(result);
      this.stepFinish(result);
    }
  }
}
