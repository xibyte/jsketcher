import Vector from 'math/vector';
import * as fetch from '../fetchers'
import {Arc} from '../shapes/arc'
import {Tool} from './tool'
import {Segment} from "../shapes/segment";
import {AlgNumConstraint, ConstraintDefinitions} from "../constr/ANConstraints";
import {distanceAB} from "math/distance";

export class FilletTool extends Tool {
  
  constructor(viewer) {
    super('fillet', viewer);  
    this.viewer = viewer;
  }
  
  restart() {
    const cands = this.getCandidateFromSelection(this.viewer.selected);
    if (cands) {
      const [c1, c2] = cands;
      if (this.breakLinkAndMakeFillet(c1, c2)) {
        this.viewer.toolManager.releaseControl();
      }
    }
  }
  
  makeFillet(point1, point2) {
    function shrink(point1) {
      let a, b;
      if (point1.id === point1.parent.a.id) {
        a = point1.parent.b;
        b = point1.parent.a;
      } else {
        a = point1.parent.a;
        b = point1.parent.b;
      }
      const d = distanceAB(a, b);
      const k = 4 / 5;
      b.x = a.x + (b.x - a.x) * k;
      b.y = a.y + (b.y - a.y) * k;
      return new Vector(a.x - b.x, a.y - b.y, 0);
    }

    const v1 = shrink(point1);
    const v2 = shrink(point2);
  
    if (v1.cross(v2).z > 0) {
      const _ = point1;
      point1 = point2;
      point2 = _;
    }

    const vec = new Vector();
    vec.setV(point2);
    vec._minus(point1);
    vec._multiply(0.5);
    vec._plus(point1);
  
    const arc = new Arc(
      point1.x, point1.y,
      point2.x, point2.y,
      vec.x, vec.y);
    point1.parent.layer.add(arc);
    const pm = this.viewer.parametricManager;

    const s1 = point1.parent;
    const s2 = point2.parent;

    const inverted1 = s1.nx * arc.c.x + s1.ny * arc.c.y < s1.w;
    const inverted2 = s2.nx * arc.c.x + s2.ny * arc.c.y < s2.w;
    arc.stabilize(this.viewer);

    pm.add(new AlgNumConstraint(ConstraintDefinitions.Fillet, [point1.parent, point2.parent, arc], {
      inverted1,
      inverted2
    }));

    pm.add(new AlgNumConstraint(ConstraintDefinitions.PCoincident, [point1, arc.a]));
    pm.add(new AlgNumConstraint(ConstraintDefinitions.PCoincident, [point2, arc.b]));

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
  
    // var solver = pm.solve();
  //  var solver = pm.solve([point1._x, point1._y, point2._x, point2._y]);
  //   pm.notify();
  //   this.viewer.refresh();
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
    let coi = null;
    for (let c of point1.constraints) {
      if (c.schema.id === ConstraintDefinitions.PCoincident.id) {
        if (c.objects.indexOf(point2) !== -1) {
          coi = c;
          break;
        }
      }
    }
    if (coi != null) {
      pm.remove(coi);
      this.makeFillet(point1, point2);
      this.viewer.withdrawAll('tool');
      this.viewer.deselectAll();
      return true;
    }
    return false;
  }
  
  static isLine(line) {
    return line != null && line.TYPE === 'Segment';
  }

  getCandidate(e) {
    const picked = this.viewer.pick(e);
    return this.getCandidateFromSelection(picked);
  }

  getCandidateFromSelection(picked) {
    
    let preferSketchLayer = (a, b) => (a.effectiveLayer === b.effectiveLayer)? 0 : a.effectiveLayer.name === 'sketch' ? -1 : 1;

    if (picked.length > 0) {
      let res = fetch.sketchObjects(picked, true, ['TCAD.TWO.EndPoint']);
      if (res == null) return null;
      let point1 = res.sort(preferSketchLayer)[0];
      if (!FilletTool.isLine(point1.parent)) return;

      const linked = [];
      point1.visitLinked(l => {
        if (l !== point1 && FilletTool.isLine(l.parent)) {
          linked.push(l);
        }
      });

      if (linked.length) {
        linked.sort(preferSketchLayer);
        return [point1, linked[0]];
      }
    }
    return null;
  }
  
  mousemove(e) {
    var needRefresh = false;
    if (this.viewer.captured.tool.length !== 0) {
      this.viewer.withdrawAll('tool');
      needRefresh = true;
    }
    var candi = this.getCandidate(e);
    if (candi != null) {
      this.viewer.capture('tool', [candi[0]], true);
      needRefresh = true;
    }
    if (needRefresh) {
      this.viewer.refresh();
    }
  }
}
