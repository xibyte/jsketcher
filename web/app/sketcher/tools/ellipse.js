import {Tool} from './tool'
import {Ellipse} from '../shapes/ellipse'
import {EllipticalArc} from '../shapes/elliptical-arc'

export const CENTER = 0;
export const RADIUS_X = 1;
export const RADIUS_Y = 2;


export class EllipseTool extends Tool {

  constructor(viewer, arc) {
    super(arc ? 'elliptical arc' : 'ellipse', viewer);
    this.arc = arc;
    this.ellipse = null;
    this.state = CENTER;
  }
  
  restart() {
    this.ellipse = null;
    this.state = CENTER;
    this.sendHint('specify a center of the ellipse')
  }

  cleanup(e) {
    this.viewer.cleanSnap();
  }
  
  point(e) {
    return this.viewer.snapped ? this.viewer.snapped : this.viewer.screenToModel(e);
  }
  
  newEllipse(p) {
    return this.arc ? new EllipticalArc(p.x, p.y, 0, 0, 0, p.x, p.y, p.x, p.y) : new Ellipse(p.x, p.y, 0, 0, 0);
  }
  
  demoBPoint() {
    const arc = this.ellipse;
    let ang = Math.atan2(arc.a.y - arc.centerY, arc.a.x - arc.centerX) + (2 * Math.PI - 0.3);
    ang %= 2 * Math.PI;
    const r = arc.radiusAtAngle(ang - arc.rotation);
    arc.b.x = arc.centerX + r * Math.cos(ang);
    arc.b.y = arc.centerY + r * Math.sin(ang);
  }
  
  mouseup(e) {
    switch (this.state) {
      case CENTER: {
        const p = this.point(e);
        this.ellipse = this.newEllipse(p);
        this.snapIfNeed(this.ellipse.c);
        this.viewer.activeLayer.add(this.ellipse);
        this.viewer.refresh();
        this.state = RADIUS_X;
        this.sendHint('specify major radius');
        break;
      }
      case RADIUS_X: {
        this.state = RADIUS_Y;
        this.sendHint('specify minor radius');
        break;
      }
      case RADIUS_Y:
        if (this.arc) {
          this.ellipse.stabilize(this.viewer);
        }
        this.viewer.toolManager.releaseControl();
    }
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    switch (this.state) {
      case CENTER: {
        this.viewer.snap(p.x, p.y, []);
        break;
      }
      case RADIUS_X: {

        const dx = p.x - this.ellipse.c.x;
        const dy = p.y - this.ellipse.c.y;

        const rot = Math.atan2(dy, dx);
        const rx = Math.sqrt(dx*dx + dy*dy);

        this.ellipse.rx.set(rx);
        this.ellipse.rot.set(rot);

        if (this.arc) {
          this.ellipse.a.setFromPoint(p);
          this.demoBPoint();
        }
        break;
      }
      case RADIUS_Y: {

        const dx = p.x - this.ellipse.c.x;
        const dy = p.y - this.ellipse.c.y;

        const rot = this.ellipse.rotation;
        const axisX = - Math.sin(rot);
        const axisY =   Math.cos(rot);


        const ry = Math.abs(dx * axisX + dy * axisY);

        this.ellipse.ry.set(ry);

        if (this.arc) {
          this.demoBPoint();
        }
        break;
      }
    } 
    this.viewer.refresh();
  }
}