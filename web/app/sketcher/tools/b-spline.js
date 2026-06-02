import { Tool } from "./tool";
import { Segment } from "../shapes/segment";
import { EndPoint } from "../shapes/point";
import {
  IBSplineOpts,
  CentripetalParameterMethod,
  CPointsCalculator,
  BSpline,
  BSplineType,
  ParameterMethod,
} from "../shapes/b-spline";
import Vector from "math/vector";
import { TOLERANCE, arePointsEqual } from "math/equality";

export class BSplineTool extends Tool {
  constructor(viewer, interpolation) {
    super("basic spline curve", viewer);
    this.init(interpolation);
    this._v = new Vector();
  }

  init(interpolation) {
    this.degree = 3;
    this.interpolation = interpolation;
    this.curveType = BSplineType.Clamped;
    this.method = ParameterMethod.Centripetal;
    this.fPoints = [];
    this.cPoints = [];
    this.curve = null;
    this.otherCurveEndPoint = null;
  }

  restart() {
    this.init(this.interpolation);
    this.sendHint("specify first point");
  }

  cleanup(e) {
    this.viewer.cleanSnap();
  }

  mouseup(e) {
    const p = this.viewer.screenToModel(e);
    const fLength = this.fPoints.length;
    const cLength = this.cPoints.length;
    if (this.interpolation && fLength && arePointsEqual(this.fPoints[fLength - 1], p, TOLERANCE)) {
      return;
    }
    if (!this.interpolation && cLength && arePointsEqual(this.cPoints[cLength - 1], p, TOLERANCE)) {
      return;
    }
    let point = new EndPoint(p.x, p.y);
    if (this.viewer.snapped != null) {
      const snapWith = this.viewer.snapped;
      point.setFromPoint(snapWith);
    }
    if (this.interpolation && fLength && arePointsEqual(this.fPoints[0], point, TOLERANCE)) {
      point = this.fPoints[0];
    } else if (!this.interpolation && cLength && arePointsEqual(this.cPoints[0], point, TOLERANCE)) {
      point = this.cPoints[0];
    } else {
      point.visible = true;
      this.viewer.parametricManager.stage.assignObject(point);
      if (this.viewer.snapped != null) {
        this.snapIfNeed(point);
      }
    }

    if (this.interpolation) {
      this.mouseupWithInterpolate(point);
    } else {
      this.mouseupWithCVModel(point);
    }
    this.viewer.refresh();
    if (this.curveType === BSplineType.Closed) {
      this.curve.stabilize(this.viewer);
      this.viewer.parametricManager.finishTransaction();
      this.viewer.toolManager.releaseControl();
    }
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    if (this.curve == null) {
      this.viewer.snap(p.x, p.y, []);
      this.viewer.refresh();
      return;
    }

    const fLength = this.fPoints.length;
    const cLength = this.cPoints.length;
    if (this.interpolation && fLength && arePointsEqual(this.fPoints[fLength - 1], p, TOLERANCE)) {
      return;
    }
    if (!this.interpolation && cLength && arePointsEqual(this.cPoints[cLength - 1], p, TOLERANCE)) {
      return;
    }
    if (this.interpolation) {
      this.mousemoveWithInterpolate(p);
    } else {
      this.mousemoveWithCVModel(p);
    }
    this.viewer.refresh();
  }

  mouseupWithInterpolate(point) {
    this.fPoints.push(point);
    if (this.fPoints.length < 2) {
      this.curve = point;
      this.viewer.activeLayer.add(this.curve);
    } else if (this.fPoints.length == 2) {
      const b = this.curve.b;
      this.curve.children.delete(b);
      this.curve.b = point;
      b.parent = null;
      this.curve.addChild(point);
      this.viewer.activeLayer.remove(b);
    } else {
      this.curve.removeFPoint();
      this.curve.addFPoint(point);
      if (arePointsEqual(this.fPoints[0], point, TOLERANCE)) {
        this.curveType = BSplineType.Closed;
        this.method = ParameterMethod.QuasiUniform;
      }
      this.curve.update(this.curveType, this.method);
    }
    if (this.curve !== null) {
      this.curve.stabilize(this.viewer);
    }
    this.viewer.refresh();
  }

  mouseupWithCVModel(point) {
    this.cPoints.push(point);
    const start = Math.floor((this.degree - 1) / 2);
    if (this.cPoints.length < 2) {
      this.cPoints.push(...new Array(start).fill(point));
      this.curve = point;
      this.viewer.activeLayer.add(this.curve);
    } else if (Object.getPrototypeOf(this.curve).TYPE == "Segment" && this.cPoints.length == start + 2) {
      const b = this.curve.b;
      this.curve.children.delete(b);
      this.curve.b = point;
      b.parent = null;
      this.curve.addChild(point);
      this.viewer.activeLayer.remove(b);
    } else {
      const preType = this.curveType;
      if (arePointsEqual(this.cPoints[0], point, TOLERANCE)) {
        this.curveType = BSplineType.Closed;
        this.method = ParameterMethod.QuasiUniform;
      }
      if (this.curveType === BSplineType.Closed) {
        const start = Math.floor((this.degree - 1) / 2);
        const newCpoints = this.cPoints.slice(start);
        const cPoints = [...newCpoints];
        for (let i = 1; i < this.degree; ++i) {
          cPoints.push(newCpoints[i % newCpoints.length]);
        }
        this.curve.resetCPoints(cPoints, true);
      } else if (this.curveType === BSplineType.Clamped && preType === BSplineType.Clamped) {
        this.curve.removeCPoint();
        this.curve.addCPoint(point);
      } else if (this.curveType === BSplineType.Clamped && preType === BSplineType.Closed) {
        const p = this.cPoints.pop();
        this.makeCV(p);
        this.cPoints.push(p);
      }
      this.curve.cvUpdate(this.curveType, this.method);
    }
    if (this.curve !== null) {
      this.curve.stabilize(this.viewer);
    }
  }

  mousemoveWithInterpolate(p) {
    if (Object.getPrototypeOf(this.curve).TYPE == "Point" && this.fPoints.length == 1) {
      // this.viewer.activeLayer.remove(this.curve);
      // this.curve = new Segment(this.fPoints[0].x, this.fPoints[0].y, p.x, p.y);
      // const a = this.curve.a;
      // this.curve.a = this.fPoints[0];
      // this.curve.children.shift();
      // a.parent = null;
      // this.curve.addChild(this.fPoints[0]);
      // this.viewer.activeLayer.add(this.curve);
      // this.viewer.activeLayer.remove(a);
      this.makeSegment(this.fPoints[0], p);
    } else if (Object.getPrototypeOf(this.curve).TYPE == "Segment" && this.fPoints.length == 1) {
      this.updateSegment(p);
    } else if (Object.getPrototypeOf(this.curve).TYPE == "Segment" && this.fPoints.length == 2) {
      // const point = new EndPoint(p.x, p.y);
      // const fPoints = [...this.fPoints, point];
      // const kValues = [
      //   ...new Array(this.degree).fill(0.0),
      //   ...new Array(fPoints.length).fill(1.0),
      //   ...new Array(this.degree).fill(1.0)
      // ];
      // const cPoints = [
      //   ...new Array(Math.floor((this.degree - 1) / 2)).fill(this.fPoints[0]),
      //   ...fPoints,
      //   ...new Array(Math.floor(this.degree / 2)).fill(point)
      // ];
      // const opts = {
      //   degree: this.degree,
      //   cPoints: cPoints,
      //   fPoints: fPoints,
      //   kValues: kValues,
      //   interpolation: true,
      //   CVModel: false,
      //   type: this.curveType,
      //   method: this.method,
      // };
      // this.viewer.activeLayer.remove(this.curve);
      // this.curve = new BSpline(opts);
      // this.curve.update(this.curveType, this.method);
      // this.viewer.activeLayer.add(this.curve);
      // this.viewer.snap(p.x, p.y, this.curve.fPoints.slice(-2));
      this.makeInterpolate(p);
    } else {
      // if (this.curve.fPoints.length == this.fPoints.length) {
      //   const point = new EndPoint(p.x, p.y);
      //   point.visible = true;
      //   this.curve.addFPoint(point);
      // } else {
      //   const point = this.curve.fPoints[this.fPoints.length];
      //   point.x = p.x;
      //   point.y = p.y;
      // }
      // this.viewer.snap(p.x, p.y, this.curve.fPoints.slice(-2));
      // this.curve.update(this.curveType, this.method);
      this.updateInterpolate(p);
    }
  }

  makeSegment(aPoint, p) {
    this.viewer.activeLayer.remove(this.curve);
    this.curve = new Segment(aPoint.x, aPoint.y, p.x, p.y);
    const a = this.curve.a;
    this.curve.children.delete(a);
    this.curve.a = aPoint;
    a.parent = null;
    this.curve.addChild(aPoint);
    this.viewer.activeLayer.add(this.curve);
    this.viewer.activeLayer.remove(a);
  }

  updateSegment(p) {
    this.curve.b.x = p.x;
    this.curve.b.y = p.y;
    this.viewer.snap(p.x, p.y, [this.curve.a, this.curve.b]);
  }

  makeInterpolate(p) {
    const point = new EndPoint(p.x, p.y);
    const fPoints = [...this.fPoints, point];
    const kValues = [];
    const cPoints = [];
    if (arePointsEqual(point, fPoints[0], TOLERANCE)) {
      this.curveType = BSplineType.Closed;
      this.method = ParameterMethod.QuasiUniform;
      const num = fPoints.length + 2 * this.degree;
      kValues.push(...Array.from({ length: num }, (_, i) => i / (num - 1)));
      for (let i = 0; i < num - this.degree - 1; ++i) {
        cPoints.push(fPoints[i % fPoints.length]);
      }
    } else {
      this.curveType = BSplineType.Clamped;
      this.method = ParameterMethod.Centripetal;
      kValues.push(
        ...new Array(this.degree).fill(0.0),
        ...new Array(fPoints.length).fill(1.0),
        ...new Array(this.degree).fill(1.0),
      );
      cPoints.push(
        ...new Array(Math.floor((this.degree - 1) / 2)).fill(this.fPoints[0]),
        ...fPoints,
        ...new Array(Math.floor(this.degree / 2)).fill(point),
      );
    }
    const opts = {
      degree: this.degree,
      cPoints: cPoints,
      fPoints: fPoints,
      kValues: kValues,
      interpolation: true,
      CVModel: false,
      type: this.curveType,
      method: this.method,
    };
    this.viewer.activeLayer.remove(this.curve);
    this.curve = new BSpline(opts);
    this.curve.update(this.curveType, this.method);
    this.viewer.activeLayer.add(this.curve);
    if (this.curveType === BSplineType.Clamped) {
      this.viewer.snap(p.x, p.y, [...this.curve.cPoints, ...this.curve.fPoints.slice(-2)]);
    } else if (this.curveType == BSplineType.Closed) {
      this.viewer.snap(p.x, p.y, [...this.cPoints, this.curve.fPoints[1]]);
    }
  }

  updateInterpolate(p) {
    const pEq = arePointsEqual(p, this.fPoints[0], TOLERANCE);
    const snapped = this.viewer.snap(p.x, p.y, this.curve.fPoints.slice(-1));
    let x = p.x;
    let y = p.y;
    if (pEq || (snapped && arePointsEqual(snapped, this.fPoints[0], TOLERANCE))) {
      this.curveType = BSplineType.Closed;
      this.method = ParameterMethod.QuasiUniform;
      x = this.fPoints[0].x;
      y = this.fPoints[0].y;
    } else {
      this.curveType = BSplineType.Clamped;
      this.method = ParameterMethod.Centripetal;
    }
    if (this.curve.fPoints.length == this.fPoints.length) {
      const point = new EndPoint(x, y);
      point.visible = true;
      this.curve.addFPoint(point);
    } else {
      const point = this.curve.fPoints[this.fPoints.length];
      point.x = x;
      point.y = y;
    }
    this.viewer.snap(p.x, p.y, [...this.curve.cPoints, ...this.curve.fPoints.slice(-2)]);
    this.curve.update(this.curveType, this.method);
  }

  mousemoveWithCVModel(p) {
    const start = Math.floor((this.degree - 1) / 2);
    if (Object.getPrototypeOf(this.curve).TYPE == "Point" && this.cPoints.length == start + 1) {
      // this.viewer.activeLayer.remove(this.curve);
      // this.curve = new Segment(this.cPoints[0].x, this.cPoints[0].y, p.x, p.y);
      // this.viewer.activeLayer.add(this.curve);
      this.makeSegment(this.cPoints[0], p);
    } else if (Object.getPrototypeOf(this.curve).TYPE == "Segment" && this.cPoints.length == start + 1) {
      // this.curve.b.x = p.x;
      // this.curve.b.y = p.y;
      // this.viewer.snap(p.x, p.y, [this.curve.a, this.curve.b]);
      this.updateSegment(p);
    } else if (Object.getPrototypeOf(this.curve).TYPE == "Segment" && this.cPoints.length == start + 2) {
      // const cPoints = [
      //   ...this.cPoints,
      //   ...new Array(Math.floor(this.degree / 2) + 1).fill(new EndPoint(p.x, p.y))
      // ];
      // const fPoints = cPoints.slice(start, start + 3);
      // const kValues = [
      //   ...new Array(this.degree).fill(0.0),
      //   ...new Array(fPoints.length).fill(1.0),
      //   ...new Array(this.degree).fill(1.0)
      // ];
      // const opts = {
      //   degree: this.degree,
      //   cPoints: cPoints,
      //   fPoints: fPoints,
      //   kValues: kValues,
      //   interpolation: false,
      //   CVModel: true,
      // };
      // this.viewer.activeLayer.remove(this.curve);
      // this.curve = new BSpline(opts);
      // this.curve.cvUpdate(this.curveType, this.method);
      // this.viewer.activeLayer.add(this.curve);
      // this.viewer.snap(p.x, p.y, [...this.curve.cPoints.slice(-1), ...this.curve.fPoints.slice(-1)]);
      this.makeCV(p);
    } else {
      // const num = Math.floor(this.degree / 2) + 1;
      // if (this.curve.cPoints.length - num == this.cPoints.length) {
      //   for (let i = 0; i < num; i++) {
      //     const point = this.curve.cPoints.pop();
      //     // point.visible = false;
      //     this.curve.removeChildPoint(point);
      //   }
      //   const newPoint = new EndPoint(p.x, p.y);
      //   this.curve.addCPoint(newPoint);
      // } else {
      //   for (let j = 0; j < num + 1; j++) {
      //     this.curve.cPoints[this.curve.cPoints.length - 1 - j].x = p.x;
      //     this.curve.cPoints[this.curve.cPoints.length - 1 - j].y = p.y;
      //   }
      // }
      // this.viewer.snap(p.x, p.y, [...this.curve.cPoints.slice(-num - 2), ...this.curve.fPoints.slice(-1)]);
      // this.curve.cvUpdate(this.curveType, this.method);
      this.updateCV(p);
    }
  }

  makeCV(p) {
    const start = Math.floor((this.degree - 1) / 2);
    const end = Math.floor(this.degree / 2);
    const kValues = [];
    const cPoints = [];
    let fPoints = [];
    if (arePointsEqual(p, this.cPoints[0], TOLERANCE)) {
      this.curveType = BSplineType.Closed;
      this.method = ParameterMethod.QuasiUniform;
      // 前置曲线类型为clamped
      const num = this.cPoints.length + 1 + end + this.degree + 1;
      kValues.push(...Array.from({ length: num }, (_, i) => i / (num - 1)));
      const newCpoints = this.cPoints.slice(start);
      cPoints.push(...newCpoints);
      for (let i = 0; i < this.degree; ++i) {
        cPoints.push(newCpoints[i % newCpoints.length]);
      }
      fPoints = [...newCpoints, this.cPoints[0]].map((p) => new EndPoint(p.x, p.y));
    } else {
      this.curveType = BSplineType.Clamped;
      this.method = ParameterMethod.Centripetal;
      const point = p instanceof EndPoint ? p : new EndPoint(p.x, p.y);
      cPoints.push(...this.cPoints, ...new Array(end + 1).fill(point));
      fPoints = cPoints.slice(start, -end).map((p) => new EndPoint(p.x, p.y));
      kValues.push(
        ...new Array(this.degree).fill(0.0),
        ...new Array(fPoints.length).fill(1.0),
        ...new Array(this.degree).fill(1.0),
      );
    }
    const opts = {
      degree: this.degree,
      cPoints: cPoints,
      fPoints: fPoints,
      kValues: kValues,
      interpolation: false,
      CVModel: true,
      type: this.curveType,
      method: this.method,
    };
    this.viewer.activeLayer.remove(this.curve);
    this.curve = new BSpline(opts);
    this.curve.cvUpdate(this.curveType, this.method);
    this.viewer.activeLayer.add(this.curve);
    if (this.curveType === BSplineType.Clamped) {
      this.viewer.snap(p.x, p.y, [...this.curve.cPoints, ...this.curve.fPoints.slice(-1)]);
    } else if (this.curveType == BSplineType.Closed) {
      this.viewer.snap(p.x, p.y, [...this.curve.fPoints, this.curve.cPoints[1]]);
    }
  }

  updateCV(p) {
    const preType = this.curveType;
    const pEq = arePointsEqual(p, this.cPoints[0], TOLERANCE);
    const snapped = this.viewer.snap(p.x, p.y, this.curve.cPoints.slice(-1));
    let x = p.x;
    let y = p.y;
    if (pEq || (snapped && arePointsEqual(snapped, this.cPoints[0], TOLERANCE))) {
      this.curveType = BSplineType.Closed;
      this.method = ParameterMethod.QuasiUniform;
      x = this.cPoints[0].x;
      y = this.cPoints[0].y;
    } else {
      this.curveType = BSplineType.Clamped;
      this.method = ParameterMethod.Centripetal;
    }
    const num = Math.floor(this.degree / 2);
    if (this.curve.cPoints.length - num == this.cPoints.length) {
      if (this.curveType === BSplineType.Closed && preType === BSplineType.Closed) {
        return;
      } else if (this.curveType === BSplineType.Closed && preType === BSplineType.Clamped) {
        this.makeCV(this.cPoints[0]);
        return;
      } else if (this.curveType === BSplineType.Clamped && preType === BSplineType.Clamped) {
        for (let i = 0; i < num; i++) {
          const point = this.curve.cPoints.pop();
          // point.visible = false;
          this.curve.removeChildPoint(point);
        }
        const newPoint = new EndPoint(p.x, p.y);
        this.curve.addCPoint(newPoint);
      } else if (this.curveType === BSplineType.Clamped && preType === BSplineType.Closed) {
        this.makeCV(p);
      }
    } else {
      if (this.curveType === BSplineType.Closed && preType === BSplineType.Closed) {
        return;
      } else if (this.curveType === BSplineType.Closed && preType === BSplineType.Clamped) {
        this.makeCV(this.cPoints[0]);
        return;
      } else if (this.curveType === BSplineType.Clamped && preType === BSplineType.Clamped) {
        for (let j = 0; j < num + 1; j++) {
          this.curve.cPoints[this.curve.cPoints.length - 1 - j].x = p.x;
          this.curve.cPoints[this.curve.cPoints.length - 1 - j].y = p.y;
        }
      } else if (this.curveType === BSplineType.Clamped && preType === BSplineType.Closed) {
        this.makeCV(p);
      }
    }
    this.viewer.snap(p.x, p.y, [...this.curve.cPoints.slice(-num - 2), ...this.curve.fPoints.slice(-1)]);
    this.curve.cvUpdate(this.curveType, this.method);

    // if (this.curve.fPoints.length == this.fPoints.length) {
    //   const point = new EndPoint(x, y);
    //   point.visible = true;
    //   this.curve.addFPoint(point);
    // } else {
    //   const point = this.curve.fPoints[this.fPoints.length];
    //   point.x = x;
    //   point.y = y;
    // }
    // this.viewer.snap(p.x, p.y, [...this.curve.cPoints, ...this.curve.fPoints.slice(-2)]);
    // this.curve.update(this.curveType, this.method);
  }

  dblclick(e) {
    this.cancelSegment();
    this.viewer.toolManager.releaseControl();
  }

  keydown(e) {
    if (e.keyCode === 27) {
      this.cancelSegment();
    }
  }

  cancelSegment() {
    const start = Math.floor((this.degree - 1) / 2);
    const num = Math.floor(this.degree / 2);
    this.curveType = BSplineType.Clamped;
    this.method = ParameterMethod.Centripetal;
    if (this.curve == null) {
    } else if (Object.getPrototypeOf(this.curve).TYPE == "Point") {
      this.viewer.remove(this.curve);
      this.curve = null;
    } else if (
      Object.getPrototypeOf(this.curve).TYPE == "Segment" &&
      (this.fPoints.length == 1 || this.cPoints.length == start + 1)
    ) {
      this.viewer.remove(this.curve);
      this.curve = null;
    } else if (
      Object.getPrototypeOf(this.curve).TYPE == "Segment" &&
      (this.fPoints.length == 2 || this.cPoints.length == start + 2)
    ) {
    } else if (
      this.curve.fPoints.length == this.fPoints.length ||
      this.curve.cPoints.length - num == this.cPoints.length
    ) {
    } else if (this.fPoints.length == 2) {
      this.makeSegment(this.fPoints[0], this.fPoints[1]);
    } else if (this.cPoints.length == start + 2) {
      this.makeSegment(this.cPoints[0], this.cPoints[this.cPoints.length - 1]);
    } else if (this.interpolation) {
      this.curve.removeFPoint();
      this.curve.update(this.curveType, this.method);
    } else {
      const p = this.cPoints.pop();
      this.makeCV(p);
      this.cPoints.push(p);
    }
    if (this.curve !== null) {
      this.curve.stabilize(this.viewer);
    }
    this.viewer.refresh();
    this.cleanup(null);
  }
}
