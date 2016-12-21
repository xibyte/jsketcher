import {Tool} from './tool'
import * as math from '../../math/math';
import {EndPoint} from '../shapes/point'
import {Segment} from '../shapes/segment'
import {Constraints} from '../parametric'


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
        this.viewer.parametricManager.linkObjects([this.rectangle[2].a, this.viewer.snapped]);
      }
      if (this.firstPointSnap != null) {
        this.viewer.parametricManager.linkObjects([this.rectangle[0].a, this.firstPointSnap]);
      }
      
      this.viewer.cleanSnap();
      this.stepFinish(p);
    }
  }

  createRectangle(v) {
    const p = new EndPoint(v.x, v.y);
    //from top, clockwise
    this.rectangle = [
      new Segment(p, p.copy()),
      new Segment(p.copy(), p.copy()),
      new Segment(p.copy(), p.copy()),
      new Segment(p.copy(), p.copy())
    ];
    for (let s of this.rectangle) {
      this.viewer.activeLayer.objects.push(s);
      this.snapExclude.push(s.a, s.b);
    }
    this.pointPicked(p.x, p.y);
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
    var pm = this.viewer.parametricManager;
    pm.linkObjects([this.rectangle[3].b, this.rectangle[0].a]);
    pm.linkObjects([this.rectangle[0].b, this.rectangle[1].a]);
    pm.linkObjects([this.rectangle[1].b, this.rectangle[2].a]);
    pm.linkObjects([this.rectangle[2].b, this.rectangle[3].a]);
    const constraints = [
      new Constraints.Horizontal(this.rectangle[0]),
      new Constraints.Horizontal(this.rectangle[2]),
      new Constraints.Vertical(this.rectangle[3]),
      new Constraints.Vertical(this.rectangle[1])
    ];
    pm.addAll(constraints);
    this.viewer.refresh();
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
