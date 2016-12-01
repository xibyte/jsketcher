import Vector from '../../math/vector'
import {Styles} from '../viewer2d'
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
    point1.parent.layer.objects.push(arc);
    var pm = this.viewer.parametricManager;
    arc.stabilize(this.viewer);
    pm._add(new Constraints.Tangent( arc, point1.parent));
    pm._add(new Constraints.Tangent( arc, point2.parent));
    pm._add(new Constraints.Coincident( arc.a, point1));
    pm._add(new Constraints.Coincident( arc.b, point2));
  
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
  
    var solver = pm.solveWithLock([]);
  //  var solver = pm.solveWithLock([point1._x, point1._y, point2._x, point2._y]);
    pm.notify();
    this.viewer.refresh();
  }
  
  mouseup(e) {
    var candi = this.getCandidate(e);
    if (candi == null) return;
    var point1 = candi[0];
    var point2 = candi[1];
  
    var pm = this.viewer.parametricManager;
    for (var i = 0; i < pm.subSystems.length; i++) {
      var subSys = pm.subSystems[i];
      for (var j = 0; j < subSys.constraints.length; j++) {
        var c = subSys.constraints[j];
        if (c.NAME === 'coi' &&
          ((c.a.id === point1.id && c.b.id === point2.id) ||
          (c.b.id === point1.id && c.a.id === point2.id)))   {
          pm.remove(c);
          this.makeFillet(point1, point2);
          this.viewer.deselectAll();
          return;
        }
      }
    }
  }
  
  static isLine(line) {
    return line != null && line._class === 'TCAD.TWO.Segment';
  }
  
  getCandidate(e) {
    var picked = this.viewer.pick(e);
    if (picked.length > 0) {
      var res = fetch.sketchObjects(picked, true, ['TCAD.TWO.EndPoint']);
      if (res == null) return null;
      var point1 = res[0];
      if (!FilletTool.isLine(point1.parent)) return;
      var line2 = null;
      for (var i = 0; i < point1.linked.length; i++) {
        var point2 = point1.linked[i];
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
