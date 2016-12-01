import {Tool} from './tool'
import {EndPoint} from '../shapes/point'
import {Ellipse} from '../shapes/ellipse'
import Vector from '../../math/vector'

const STATE_POINT1 = 0;
const STATE_POINT2 = 1;
const RADIUS = 2;

export class EllipseTool extends Tool {
  
  constructor(viewer) {
    super('ellipse', viewer);
    this.ellipse = null;
    this.state = STATE_POINT1;
  }
  
  restart() {
    this.ellipse = null;
    this.state = STATE_POINT1;
    this.sendHint('specify first major axis point')
  }

  point(e) {
    return this.viewer.snapped ? this.viewer.snapped : this.viewer.screenToModel(e);
  }
  
  mouseup(e) {
    switch (this.state) {
      case STATE_POINT1: {
        const p = this.point(e);
        this.ellipse = new Ellipse(new EndPoint(p.x, p.y), new EndPoint(p.x, p.y));
        this.viewer.activeLayer.objects.push(this.ellipse);
        this.viewer.refresh();
        this.state = STATE_POINT2;
        this.sendHint('specify second major axis point')
        break;
      }
      case STATE_POINT2: {
        const p = this.point(e);
        this.ellipse.ep2.setFromPoint(p);
        this.viewer.refresh();
        this.state = RADIUS;
        this.sendHint('specify minor axis radius')
        break;
      }
      case RADIUS:
        this.viewer.toolManager.releaseControl();
    }
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    switch (this.state) {
      case STATE_POINT1:
        this.viewer.snap(p.x, p.y, []);
        break;
      case STATE_POINT2:
        this.ellipse.ep2.setFromPoint(this.viewer.screenToModel(e));
        this.ellipse.r.value = this.ellipse.radiusX * 0.5;
        this.viewer.snap(p.x, p.y, [this.ellipse.ep1]);
        break;
      case RADIUS:
        const polarPoint = this.ellipse.toEllipseCoordinateSystem(p);
        let minorRadius = Ellipse.findMinorRadius(this.ellipse.radiusX, polarPoint.radius, polarPoint.angle);
        if (isNaN(minorRadius)) {
          const projAxis = new Vector(-(this.ellipse.ep2.y - this.ellipse.ep1.y), this.ellipse.ep2.x - this.ellipse.ep1.x);
          projAxis._normalize();
          const v = new Vector(this.ellipse.ep2.x - p.x, this.ellipse.ep2.y - p.y);
          minorRadius = Math.abs(projAxis.dot(v));
        }
        this.ellipse.r.value = minorRadius;
        break;
    } 
    this.viewer.refresh();
  }


}