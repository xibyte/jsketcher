import Vector from 'math/vector';
import {Styles} from '../styles'
import * as fetch from '../fetchers'
import * as math from '../../math/math'
import {EndPoint} from '../shapes/point'
import {Arc} from '../shapes/arc'
import {Constraints} from '../parametric'
import {Tool} from './tool'

export class FilletTool extends Tool {
  
  constructor(viewer) {
    super('fillet', viewer);  
    this.viewer = viewer;
  }
  
  restart() {
    for (let master of this.viewer.selected) {
      if (master instanceof EndPoint) {
        for (let slave of master.linked) {
          if (slave instanceof EndPoint) {
            if (this.breakLinkAndMakeFillet(master, slave)) {
              this.viewer.toolManager.releaseControl();
            }
          }
        }        
      }
    }
  }
  
  makeFillet(point1, point2) {
    function shrink(point1) {
      var a, b;
      if (point1.id === point1.parent.a.id) {
        a = point1.parent.b;
        b = point1.parent.a;
      } else {
        a = point1.parent.a;
        b = point1.parent.b;
      }
      var d = math.distanceAB(a, b);
      var k = 4 / 5;
      b.x = a.x + (b.x - a.x) * k;
      b.y = a.y + (b.y - a.y) * k;
      return new Vector(a.x - b.x, a.y - b.y, 0);
    }
  
    var v1 = shrink(point1);
    var v2 = shrink(point2);
  
    if (v1.cross(v2).z > 0) {
      var _ = point1;
      point1 = point2;
      point2 = _;
    }
  
    var vec = new Vector();
    vec.setV(point2);
    vec._minus(point1);
    vec._multiply(0.5);
    vec._plus(point1);
  
    var arc = new Arc(
      new EndPoint(point1.x, point1.y),
      new EndPoint(point2.x, point2.y),
      new EndPoint(vec.x, vec.y));
    point1.parent.layer.add(arc);
    var pm = this.viewer.parametricManager;
    arc.stabilize(this.viewer);
    pm._add(new Constraints.Fillet( point1, point2, arc));
    
    this.viewer.validators.push(() => {
      function validOn(p, left) {
        let op = p.parent.opposite(p);
        let opV = op.toVector();
        let dir = p.toVector()._minus(opV)._normalize();
        let centerDir = arc.c.toVector()._minus(opV)._normalize();
        let z = centerDir.cross(dir).z;
        
        return left ? z < 0.1 : z > -0.1;
      }
      return validOn(point1, true) && validOn(point2, false);       
    });
    //function otherEnd(point) {
    //  if (point.parent.a.id === point.id) {
    //    return point.parent.b;
    //  } else {
    //    return point.parent.a;
    //  }
    //}
    //
    //pm._add(new Constraints.LockConvex(arc.c, arc.a, otherEnd(point1)));
    //pm._add(new Constraints.LockConvex(otherEnd(point2), arc.b, arc.c));
  
    var solver = pm.solve();
  //  var solver = pm.solve([point1._x, point1._y, point2._x, point2._y]);
    pm.notify();
    this.viewer.refresh();
  }
  
  mouseup(e) {
    var candi = this.getCandidate(e);
    if (candi == null) return;
    const point1 = candi[0];
    const point2 = candi[1];
    this.breakLinkAndMakeFillet(point1, point2)
  }
  
  breakLinkAndMakeFillet(point1, point2) {
    const pm = this.viewer.parametricManager;
    const coi = pm.findCoincidentConstraint(point1, point2);
    if (coi != null) {
      pm.remove(coi);
      this.makeFillet(point1, point2);
      this.viewer.deselectAll();
      return true;
    }
    return false;
  }
  
  static isLine(line) {
    return line != null && line._class === 'TCAD.TWO.Segment';
  }
  
  getCandidate(e) {
    
    let preferSketchLayer = (a, b) => (a.effectiveLayer === b.effectiveLayer)? 0 : a.effectiveLayer.name === 'sketch' ? -1 : 1;
    
    let picked = this.viewer.pick(e);
    if (picked.length > 0) {
      let res = fetch.sketchObjects(picked, true, ['TCAD.TWO.EndPoint']);
      if (res == null) return null;
      let point1 = res.sort(preferSketchLayer)[0];
      if (!FilletTool.isLine(point1.parent)) return;
      let linked = [...point1.linked].sort(preferSketchLayer);
      for (let i = 0; i < linked.length; i++) {
        let point2 = linked[i];
        if (FilletTool.isLine(point2.parent)) {
          return [point1, point2];
        }
      }
    }
    return null;
  }
  
  mousemove(e) {
    var needRefresh = false;
    if (this.viewer.selected.length != 0) {
      this.viewer.deselectAll();
      needRefresh = true;
    }
    var candi = this.getCandidate(e);
    if (candi != null) {
      this.viewer.mark(candi[0], Styles.SNAP);
      needRefresh = true;
    }
    if (needRefresh) {
      this.viewer.refresh();
    }
  }
}
