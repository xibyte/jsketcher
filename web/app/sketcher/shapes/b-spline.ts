import { EndPoint } from "./point";
import { Segment } from "./segment";
import Vector from "math/vector";
import { SketchObject } from "./sketch-object";
import { Layer, Viewer } from "../viewer2d";
import { TOLERANCE, TOLERANCE_SQ, areEqual, arePointsEqual } from "math/equality";
import {VectorData, cross2d, normalize} from "math/vec";
import {distanceAB} from "math/distance";
import { lu_solve } from "math/optim/dogleg";
import { isPointInsidePolygon, polygonOffset, ConvexHull2D } from "geom/euclidean";

type IPolynomialFunc = (t: number) => number;
type IPoint = { x: number; y: number; z?: number };
type BezierSegment = { cps: { x: number; y: number }[]; u0: number; u1: number };
export const getDividedValue = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    return 0;
  } else {
    return numerator / denominator;
  }
};

export class BSplinePolynomial {
  /** * B-spline polynomial with variable coefficients */
  readonly order: number;
  kValues: number[];
  maxIndex: number;
  private cache: Map<number, IPolynomialFunc> = new Map();
  private polynomialArray: BSplinePolynomial[] = [];
  /**
   * @param kValues Polynomial value boundary points Node vector
   * @param order The degree of the polynomial (for example, 3rd order is 2nd order, 5th order is 4th order) degree = order - 1 degree is the degree of the B-spline curve
   */
  constructor(kValues: number[], order: number) {
    this.order = order;
    this.kValues = kValues;
    this.maxIndex = kValues.length - this.order;
    this.polynomialArray = [];
    for (let i = 0; i < this.order; i += 1) {
      this.polynomialArray.push(new BSplinePolynomial(this.kValues, i));
    }
  }

  updateKValues(kValues: number[]) {
    this.kValues = kValues;
    this.maxIndex = kValues.length - this.order;

    this.cache.clear();

    if (this.polynomialArray.length === 0) {
      for (let i = 0; i < this.order; i += 1) {
        this.polynomialArray.push(new BSplinePolynomial(this.kValues, i));
      }
    } else {
      for (let i = 0; i < this.order; i += 1) {
        this.polynomialArray[i].updateKValues(this.kValues);
      }
    }
  }

  get(index: number): IPolynomialFunc {
    if (index > this.maxIndex) {
      return () => 0;
    }
    const cacheFunc = this.cache.get(index);
    if (cacheFunc) {
      return cacheFunc;
    }
    return this.getPolynomialFunc(index);
  }

  /**
   * Get the polynomial evaluation function, that is, the vector polynomial variable coefficient,
   * and return a function that accepts the t parameter
   */
  private getPolynomialFunc(index: number): IPolynomialFunc {
    const tList = this.kValues;
    const { order } = this;
    const polynomialIndexSubtractOne = this.polynomialArray[order - 1];
    let func: IPolynomialFunc;
    if (order === 1) {
      func = (t: number) => {
        if (t >= this.kValues[index] && t < this.kValues[index + 1]) {
          return 1;
        } else {
          return 0;
        }
      };
    } else {
      const k1 = tList[index + order - 1] - tList[index];
      const k2 = tList[index + order] - tList[index + 1];
      func = (t: number) =>
        getDividedValue(t - tList[index], k1) * polynomialIndexSubtractOne.get(index)(t) +
        getDividedValue(tList[index + order] - t, k2) * polynomialIndexSubtractOne.get(index + 1)(t);
    }
    this.cache.set(index, func);
    return func;
  }
}

// B-spline curve interpolation drawing method and control point drawing method
class BSplineInterpolation {
  // Interpolation only supports cubic B-spline
  interpolation: boolean;
  degree: number;
  kSolver: KnotsCalculator;
  cSolver: CPointsCalculator;
  cPoints: EndPoint[];
  kValues: number[];
  fPoints: EndPoint[];
  constructor(degree: number, interpolation: boolean) {
    this.degree = degree;
    this.interpolation = interpolation;
    this.init();
  }

  init() {
    this.fPoints = [];
    this.cPoints = [];
    this.kValues = [];
    if (this.interpolation) {
      this.kSolver = new GeneralKnotsCalculator();
      this.cSolver = new CPointsCalculator();
    } else {
      this.kSolver = null;
      this.cSolver = null;
    }
  }

  update(fPoints: EndPoint[]) {
    if (!this.interpolation) {
      return;
    }
    this.fPoints = fPoints;
    if (this.fPoints.length < 3) {
      this.interpolation = false;
    }
  }

  solve(type: string, method: number) {
    // Solve the nodes and control points according to the interpolation points fPoints
    if (!this.interpolation) {
      return;
    }
    this.kValues = this.kSolver.calculate(this.fPoints, this.degree, type, method);
    this.cSolver.setup(this.kValues, this.fPoints, this.degree);
    const cPointsCoordinates = this.cSolver.calculate(type);
    cPointsCoordinates.forEach((item, index) => {
      if (index < this.cPoints.length) {
        this.cPoints[index].x = item.x;
        this.cPoints[index].y = item.y;
      } else {
        this.cPoints.push(new EndPoint(item.x, item.y));
      }
    });
    this.cPoints.length = cPointsCoordinates.length;
  }
}

class BSplineControlVertices {
  // B-spline curve control point drawing method, support drawing spline curves of different degrees
  CVModel: boolean;
  maxDegree: number;
  degree: number;
  cPoints: EndPoint[];
  kValues: number[];
  fPoints: EndPoint[];
  kSolver: KnotsCalculator;
  constructor(degree: number, CVModel: boolean) {
    this.maxDegree = degree;
    this.CVModel = CVModel;
    this.fPoints = [];
    this.cPoints = [];
    this.kValues = [];
    this.kSolver = new GeneralKnotsCalculator();
  }

  update(cPoints: EndPoint[], degree: number) {
    if (!this.CVModel) {
      return;
    }
    this.cPoints = cPoints;
    if (this.cPoints.length < 3) {
      this.CVModel = false;
    }
    this.maxDegree = degree;
    if (this.cPoints.length < this.maxDegree + 1) {
      this.degree = this.cPoints.length - 1;
    } else {
      this.degree = this.maxDegree;
    }
  }

  solve(type: string, method: number) {
    // Solve the nodes, the number of which meets the control point and order requirements,
    // and fill 0 and 1 at both ends to make the spline curve clamped and evenly segmented in the middle.
    const cPoints = []
    if (type === BSplineType.Clamped) {
      const start = Math.floor((this.degree - 1) / 2);
      const end = Math.floor(this.degree / 2);
      cPoints.push(...this.cPoints.slice(start, -end));
    } else if (type === BSplineType.Closed) {
      cPoints.push(...this.cPoints.slice(0, -this.degree + 1));
    }
    this.fPoints = [this.cPoints[0], this.cPoints[this.cPoints.length - 1]];
    this.kValues = this.kSolver.calculate(cPoints, this.degree, type, method);
    // this.kValues = [...new Array(this.degree + 1).fill(0.0)];
    // for (let i = 0; i < this.cPoints.length - this.degree - 1; ++i) {
    //   this.kValues.push((i + 1) / (this.cPoints.length - this.degree));
    // }
    // this.kValues.push(...new Array(this.degree + 1).fill(1.0));
  }
}

export interface IBSplineOpts {
  degree: number;
  cPoints: IPoint[] | EndPoint[];
  fPoints: IPoint[] | EndPoint[];
  kValues: number[];
  interpolation: boolean; // If true, the interpolation method is manually drawn
  CVModel: boolean; // If true, the CV method is used for manual drawing. If both are false, the data is read and drawn.
  type?: string;
  method?: number;
}

export class BSpline extends SketchObject {
  ctx: CanvasRenderingContext2D | undefined;

  scale: number;

  degree: number;

  type: string;

  method: number;

  order: number;

  cPoints: EndPoint[]; // Spline control points

  kValues: number[]; // Spline Nodes

  knots: number[]; // Curve nodes after deduplication

  fPoints: EndPoint[]; // Fitting points for easy curve adjustment

  a: EndPoint; // Start point of the curve

  b: EndPoint; // End point of the curve

  numberOfKnots: number;

  numberOfControlPoints: number;

  numberOfFitPoints: number;

  bSplinePolynomial: BSplinePolynomial;

  derivativePolynomial: BSplinePolynomial;

  bSplineInterpolation: BSplineInterpolation;

  bSplineControlVertices: BSplineControlVertices;

  hull: Vector[]; // Curved polygonal bounding box

  // discretePoints: EndPoint[]; // Fixed curve discrete points for distance calculation
  discretePointsWithScale: { [key: number]: IPoint[] }; // Record discrete points at different ratios to save computing resources

  baseLength: number; // 每一离散点对应的归一距离

  dragging: boolean = false;

  constructor(
    opts: IBSplineOpts,
    id?: string,
    ctx?: CanvasRenderingContext2D,
    scale?: number,
  ) {
    super(id);
    this.ctx = ctx;
    this.scale = scale || 1;
    this.degree = opts.degree;
    this.order = this.degree + 1;
    this.type = opts.type? opts.type: BSplineType.Clamped;
    this.method = opts.method? opts.method: -1;
    this.numberOfControlPoints = opts.cPoints.length;
    this.numberOfKnots = opts.kValues.length;
    this.numberOfFitPoints = opts.fPoints.length;
    if (this.degree >= this.numberOfControlPoints) {
      throw new Error(
        `the degree(${this.degree}) should be smaller than the length of control point(${this.numberOfControlPoints}).`,
      );
    }
    if (this.degree < 1) {
      throw new Error("degree cannot be less than 1.");
    }
    if (this.numberOfKnots !== this.numberOfControlPoints + this.order) {
      throw new Error(
        `the array length of parameter t (${this.numberOfKnots}) must be equal to the sum of the length of cPoints (${this.numberOfControlPoints}) and the degree (${this.degree}). and 1`,
      );
    }
    if (opts.interpolation || opts.CVModel) {
      this.cPoints = opts.cPoints as EndPoint[];
      this.fPoints = opts.fPoints as EndPoint[];
      this.setChildPoint([...this.cPoints, ...this.fPoints]);
    } else {
      this.cPoints = [];
      this.fPoints = [];
      for (const [i, point] of opts.cPoints.entries()) {
        const cPointId = `spline${this.id}_cPoint${i}`;
        const cPoint = new EndPoint(point.x, point.y, cPointId);
        this.addChild(cPoint);
        this.cPoints.push(cPoint);
        // cPoint.visible = false;
      }
      for (const [i, point] of opts.fPoints.entries()) {
        const fPointId = `spline${this.id}_fPoint${i}`;
        const fPoint = new EndPoint(point.x, point.y, fPointId);
        this.addChild(fPoint);
        this.fPoints.push(fPoint);
      }

    }

    this.kValues = opts.kValues;
    this.updateKnots();
    
    this.bSplinePolynomial = new BSplinePolynomial(this.kValues, this.order);
    const newKValues = this.kValues.slice(1, this.kValues.length - 1);
    this.derivativePolynomial = new BSplinePolynomial(newKValues, this.order - 1);
    this.bSplineInterpolation = new BSplineInterpolation(this.degree, opts.interpolation);
    this.bSplineControlVertices = new BSplineControlVertices(this.degree, opts.CVModel);
    if (opts.interpolation) {
      this.type = BSplineType.Clamped;
      this.bSplineInterpolation.update(this.fPoints);
    } else if (opts.CVModel) {
      this.bSplineControlVertices.update(this.cPoints, this.degree);
    }
    if (opts.fPoints.length) {
      this.a = this.fPoints[0];
      this.b = this.fPoints[this.numberOfFitPoints - 1];
    } else {
      this.a = this.cPoints[0];
      this.b = this.cPoints[this.numberOfControlPoints - 1];
      this.a.visible = true;
      this.b.visible = true;
    }
    this.baseLength = 50;
    this.discretePointsWithScale = {
      1: this.getDiscretePoints(1),
    };
  }

  updateKnots() {
    this.knots = this.kValues.slice(this.degree, -this.degree);
    // this.knots = Array.from(new Set(this.kValues)).sort((a, b) => a - b);
  }

  getPoint(t: number) {
    let x = 0;
    let y = 0;
    for (let index = 0; index < this.numberOfControlPoints; ++index) {
      const ratio = this.bSplinePolynomial.get(index)(t);
      x += ratio * this.cPoints[index].x;
      y += ratio * this.cPoints[index].y;
    }
    return { x, y };
  }

  basisFunction(i, p, u, knots) {
    if (p === 0) {
      return knots[i] <= u && u < knots[i + 1] ? 1.0 : 0.0;
    }
    const left = (u - knots[i]) / (knots[i + p] - knots[i]) || 0;
    const right = (knots[i + p + 1] - u) / (knots[i + p + 1] - knots[i + 1]) || 0;
    return left * this.basisFunction(i, p - 1, u, knots) + right * this.basisFunction(i + 1, p - 1, u, knots);
  }

  derivativeBSpline(t: number) {
    const n = this.cPoints.length - 1;
    let dx = 0,
      dy = 0;
    for (let i = 0; i < n; i++) {
      const denom = this.kValues[i + this.degree + 1] - this.kValues[i + 1];
      if (denom === 0) continue;
      const coeff = this.degree / denom;
      const diffX = this.cPoints[i + 1].x - this.cPoints[i].x;
      const diffY = this.cPoints[i + 1].y - this.cPoints[i].y;
      const Ni = this.derivativePolynomial.get(i)(t);
      dx += coeff * diffX * Ni;
      dy += coeff * diffY * Ni;
    }
    return { x: dx, y: dy };
  }

  addChildPoint(point: EndPoint): void {
    // point.id = this.id;
    this.addChild(point);
  }

  removeChildPoint(point: EndPoint) {
    this.children.forEach((item, index) => {
      if (item === point) {
        this.children.splice(index, 1);
      }
    });
  }

  setChildPoint(points: EndPoint[]) {
    this.children = points;
    points.forEach((item) => {
      item.parent = this;
    });
  }

  updatePoint(index: number, point: EndPoint) {
    if (index < 0 || index > this.cPoints.length - 1) {
      throw new Error("parameter index error.");
    }
    if (typeof this.cPoints[index] !== "undefined") {
      this.removeChildPoint(this.cPoints[index]);
    }
    this.addChildPoint(point);
    this.cPoints[index] = point;
  }

  addCPoint(point: EndPoint) {
    this.addChildPoint(point);
    this.cPoints.push(...new Array(Math.floor(this.degree / 2) + 1).fill(point));
    // for (let i = 0; i < this.degree; i++){
    //   this.cPoints.push(point);
    // }
    // point.visible = false;
    this.numberOfControlPoints = this.cPoints.length;
  }

  removeCPoint() {
    const num = Math.floor(this.degree / 2) + 1;
    for (let i = 0; i < num; i++){
      const point = this.cPoints.pop();
      point.visible = false;
      this.removeChildPoint(point);
    }
  }

  setCPoints(points: EndPoint[]) {
    this.cPoints.length = points.length;
    this.numberOfControlPoints = this.cPoints.length;
    points.forEach((item, index) => {
      this.updatePoint(index, item);
      item.visible = false;
    });
  }

  resetCPoints(points: EndPoint[], visible: boolean) {
    this.cPoints = points;
    this.numberOfControlPoints = this.cPoints.length;
    this.cPoints.forEach((item) => {
      this.addChild(item);
      item.visible = visible;
    });
  }

  addFPoint(point: EndPoint) {
    if (point.id !== this.fPoints[this.fPoints.length - 1].id) {
      this.addChild(point);
      this.fPoints.push(point);
      this.numberOfFitPoints = this.fPoints.length;
    }
  }

  removeFPoint() {
    const point = this.fPoints.pop();
    point.visible = false;
    this.removeChildPoint(point);
  }

  setFPoint(points: EndPoint[]) {
    this.fPoints.length = points.length;
    this.numberOfFitPoints = this.fPoints.length;
    for (let i = 0; i < points.length; ++i) {
      if (this.fPoints[i] !== points[i]) {
        this.removeChildPoint(this.fPoints[i]);
        this.fPoints[i] = points[i];
        this.addChild(this.fPoints[i]);
        this.fPoints[i].visible = true;
      }
    }
  }

  setFPointWithCVModel() {
    for (let i = 0; i < this.knots.length; i++) {
      const point = this.getPoint(this.knots[i]);
      if (i < this.fPoints.length) {
        this.fPoints[i].x = point.x;
        this.fPoints[i].y = point.y;
      } else {
        const endPoint = new EndPoint(point.x, point.y);
        endPoint.visible = false;
        this.fPoints.push(new EndPoint(point.x, point.y));
      }
    }
    this.fPoints.length = this.knots.length;
    this.fPoints[this.fPoints.length -1].x = this.cPoints[this.cPoints.length - 1].x;
    this.fPoints[this.fPoints.length -1].y = this.cPoints[this.cPoints.length - 1].y;
  }

  resetFPoints(points: EndPoint[], visible: boolean) {
    this.fPoints = points;
    this.numberOfFitPoints = this.fPoints.length;
    this.fPoints.forEach((item) => {
      item.visible = visible;
    });
  }

  setPointA(point: EndPoint) {
    this.a = point;
  }

  setPointB(point: EndPoint) {
    this.b = point;
  }

  setKValues(kValues: number[]) {
    this.kValues = kValues;
    this.updateKnots();
    this.bSplinePolynomial.updateKValues(this.kValues);
    const newKValues = this.kValues.slice(1, this.kValues.length - 1);
    this.derivativePolynomial.updateKValues(newKValues);
    this.numberOfKnots = this.kValues.length;
  }

  interpolate(fPoints: EndPoint[]) {
    if (fPoints.length > 2) {
      this.bSplineInterpolation.update(fPoints);
    }
  }

  update(type: string, method: number) {
    this.interpolate(this.fPoints);
    this.bSplineInterpolation.solve(type, method);
    this.setKValues(this.bSplineInterpolation.kValues);
    this.resetCPoints(this.bSplineInterpolation.cPoints, false);
    this.setPointA(this.fPoints[0]);
    this.setPointB(this.fPoints[this.fPoints.length - 1]);
    this.setChildPoint([...this.fPoints, ...this.cPoints]);
    this.type = type;
    this.method = method;
  }

  cvReset(cPoints: EndPoint[], degree: number, type: string) {
    this.bSplineControlVertices.update(cPoints, degree);
    this.degree = degree;
    this.order = this.degree + 1;
  }

  cvUpdate(type: string, method: number) {
    this.cvReset(this.cPoints, this.degree, type);
    this.bSplineControlVertices.solve(type, method);
    this.setKValues(this.bSplineControlVertices.kValues);
    // this.resetCPoints(this.bSplineControlVertices.cPoints, true);
    this.setFPointWithCVModel();
    this.setPointA(this.cPoints[0]);
    this.setPointB(this.cPoints[this.cPoints.length - 1]);
    this.setChildPoint([...this.cPoints]);
    this.type = type;
    this.method = method;
  }

  getDiscretePoints(scale: number) {
    const discretePoints: IPoint[] = [];
    for (let index = 0; index < this.knots.length - 1; ++index) {
      const f0 = this.getPoint(this.knots[index]);
      const f1 = this.getPoint(this.knots[index + 1]);
      const normalizedDistance = distanceAB(f0, f1) * scale;
      const step = (this.knots[index + 1] - this.knots[index]) * this.baseLength / normalizedDistance;
      discretePoints.push(f0);
      for (let k = this.knots[index] + step; k < this.knots[index + 1]; k += step) {
        const p = this.getPoint(k);
        discretePoints.push(p);
      }
    }
    discretePoints.push(this.b);
    return discretePoints;
  }

  visitParams(callback) {
    for (const point of this.cPoints) {
      point.visitParams(callback);
    }
  }

  normalDistance(aim: Vector, scale: number) {
    // Get the vertices of the convex polygon surrounded by control points in sequence
    const boundaryPoints = [...this.cPoints]; // Deep copy avoids ConvexHull2D function sorting affecting this.cPoints
    const hullPoints = ConvexHull2D(boundaryPoints);

    // Get the point vector after the convex polygon is expanded
    // (the center point position of the convex polygon quadrilateral bounding box remains unchanged)
    this.hull = polygonOffset(hullPoints, 1 + 0.3 / scale);
    if (isPointInsidePolygon(aim, this.hull)) {
      const discreteScale = this.getDiscreteScale(scale);
      return this.closestNormalDistance(aim, this.discretePointsWithScale[discreteScale]);
    }
    return -1;
  }

  closestNormalDistance(aim: Vector, segments: IPoint[]) {
    let hero = -1;
    for (let p = segments.length - 1, q = 0; q < segments.length; p = q++) {
      const dist = Math.min(Segment.calcNormalDistance(aim, segments[p], segments[q]));
      if (dist !== -1) {
        hero = hero === -1 ? dist : Math.min(dist, hero);
      }
    }
    return hero;
  }

  transToEndPoints(points: IPoint[]) {
    const endPoints = [];
    for (const point of points) {
      endPoints.push(new EndPoint(point.x, point.y));
    }
    return endPoints;
  }

  transToIPoints(points: EndPoint[]) {
    const IPoints = [];
    for (const point of points) {
      IPoints.push({ x: point.x, y: point.y, z: 0.0 });
    }
    return IPoints;
  }

/** 深拷贝点数组（保留 x,y） */
private clonePointsArray(points: any[]): { x: number; y: number }[] {
  return points.map(p => ({ x: p.x, y: p.y }));
}

/** 统计 knot 向量中值 u 的重数（带微小容差） */
private knotMultiplicity(U: number[], u: number, eps = 1e-12): number {
  let count = 0;
  for (const v of U) if (Math.abs(v - u) <= eps) count++;
  return count;
}

/**
 * findSpan: 返回 k 使得 U[k] <= u < U[k+1]
 * 如果 u 等于右端点，返回 n (#controlPoints - 1)
 */
private findSpan(U: number[], p: number, u: number): number {
  const m = U.length - 1;
  const n = m - p - 1; // n = #controlPoints - 1
  if (u >= U[n + 1]) return n;
  if (u <= U[p]) return p;
  let low = p, high = n + 1;
  let mid = Math.floor((low + high) / 2);
  while (u < U[mid] || u >= U[mid + 1]) {
    if (u < U[mid]) high = mid;
    else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

/**
 * 单次插入 knot（Boehm/Piegl&Tiller 单次插入局部更新）
 * 不修改入参，返回 { P: newPoints, U: newKnots }
 */
private insertKnotSingle(P_in: { x: number; y: number }[], U_in: number[], p: number, u: number) {
  // working copies
  const P = this.clonePointsArray(P_in);
  const U = U_in.slice();

  // sanity check: U.length must be P.length + p + 1
  if (U.length !== P.length + p + 1) {
    throw new Error(`Invalid input sizes: U.length=${U.length}, P.length=${P.length}, p=${p}. Expect U.length == P.length + p + 1`);
  }

  const n = P.length - 1;
  const k = findSpan(U, p, u);
  const s = this.knotMultiplicity(U, u);

  // if multiplicity already >= p, no shape change by inserting more (we can still insert but it's degenerate)
  if (s >= p) {
    // still do a safe insertion (it will create duplicated control points), or just return copies
    // for safety, return copies unchanged:
    return { P: this.clonePointsArray(P), U: U.slice() };
  }

  // prepare new Q array length n+2
  const Q: IPoint[] = new Array(n + 2).fill(null).map(() => ({ x: 0, y: 0 }));

  // copy left unaffected points: indices 0..k-p
  for (let i = 0; i <= k - p; i++) {
    Q[i] = { x: P[i].x, y: P[i].y };
  }

  // compute new points Q_i for i = k-p+1 .. k
  for (let i = k - p + 1; i <= k; i++) {
    const denom = U[i + p] - U[i];
    let a = 0;
    if (Math.abs(denom) > 1e-14) {
      a = (u - U[i]) / denom;
    } else {
      a = 0;
    }
    // Q[i] = (1-a) * P[i-1] + a * P[i]
    Q[i] = {
      x: (1 - a) * P[i - 1].x + a * P[i].x,
      y: (1 - a) * P[i - 1].y + a * P[i].y
    };
  }

  // copy right unaffected points: P[k..n] -> Q[k+1..n+1]
  for (let i = k + 1; i <= n + 1; i++) {
    // Q index i gets P[i-1]
    Q[i] = { x: P[i - 1].x, y: P[i - 1].y };
  }

  // insert u into knot vector at position k+1
  U.splice(k + 1, 0, u);

  return { P: Q, U };
}

/**
 * 在 P, U 上重复插入 u 指定次数（每次都使用 insertKnotSingle）
 */
private insertKnotRepeat(P_in: { x: number; y: number }[], U_in: number[], p: number, u: number, times: number) {
  let Pcur = this.clonePointsArray(P_in);
  let Ucur = U_in.slice();
  for (let t = 0; t < times; t++) {
    const res = this.insertKnotSingle(Pcur, Ucur, p, u);
    Pcur = res.P;
    Ucur = res.U;
  }
  return { P: Pcur, U: Ucur };
}

/**
 * 将当前样条（this.cPoints, this.kValues, this.degree）转换为等价 p 次 Bézier 段
 * 3次B样条->3次贝塞尔曲线，4次，5次，...
 * 返回数组：每项 { cps: [p+1 个 {x,y}], u0, u1 }
 */
public bsplineToBezierSegments_full(): BezierSegment[] {
  // defensive checks
  if (!this.cPoints || !this.kValues) return [];
  const p = this.degree;
  if (p < 1) return [];

  // Working copies
  let Pcur = this.clonePointsArray(this.cPoints);
  let Ucur = this.kValues.slice();

  // If closed and cPoints contains trailing duplication of first p pts, remove duplicates to form basePoints
  // if (this.type === BSplineType.Closed) {
  //   if (Pcur.length > p) {
  //     const prefix = Pcur.slice(0, p);
  //     const suffix = Pcur.slice(Pcur.length - p);
  //     let same = true;
  //     for (let i = 0; i < p; i++) {
  //       if (Math.hypot(prefix[i].x - suffix[i].x, prefix[i].y - suffix[i].y) > 1e-9) { same = false; break; }
  //     }
  //     if (same) {
  //       // base points:
  //       const base = Pcur.slice(0, Pcur.length - p);
  //       // extend by first p to facilitate indexing (but we'll still rely on refined knots & j mapping)
  //       Pcur = base.concat(base.slice(0, p));
  //     }
  //   }
  // }

  // collect unique internal knots (from U[p] to U[U.length-p-1])
  const internal = Ucur.slice(p, Ucur.length - p);
  const uniqueInternal: number[] = [];
  for (let i = 0; i < internal.length; i++) {
    if (i === 0 || Math.abs(internal[i] - internal[i - 1]) > 1e-12) uniqueInternal.push(internal[i]);
  }

  // For each unique internal knot, insert until multiplicity == p
  for (const u of uniqueInternal) {
    let mult = this.knotMultiplicity(Ucur, u);
    while (mult < p) {
      const res = this.insertKnotSingle(Pcur, Ucur, p, u);
      Pcur = res.P;
      Ucur = res.U;
      mult++;
    }
  }

  // After refinement, extract segments by scanning knot indices j
  const segments: BezierSegment[] = [];
  const Ulen = Ucur.length;
  const startJ = p;
  const endJ = Ulen - p - 2; // inclusive; j+1 must be valid index
  for (let j = startJ; j <= endJ; j++) {
    if (Math.abs(Ucur[j + 1] - Ucur[j]) <= 1e-14) continue; // zero-width span
    // Bézier control points are Pcur[j-p .. j]
    const cps: IPoint[] = [];
    for (let i = j - p; i <= j; i++) {
      // safety check index
      if (i < 0 || i >= Pcur.length) {
        throw new Error(`Index out of range during extraction: i=${i}, Pcur.length=${Pcur.length}`);
      }
      cps.push({ x: Pcur[i].x, y: Pcur[i].y });
    }
    segments.push({ cps, u0: Ucur[j], u1: Ucur[j + 1] });
  }

  return segments;
}

  /**
 * 修正版 bsplineToBezierSegments：用完整 kValues，向量交点与相对容差
 * 自己发现的几何方式求解三次样条曲线转化为三次贝塞尔曲线
 */
  bsplineToBezierSegments() {
    const bezierSegments: Array<{ a: any; b: any; cp1: any; cp2: any }> = [];

    if (this.type === BSplineType.Closed) {
      // 如需支持闭合，这里可扩展（当前保持原逻辑只做非闭合）
      return bezierSegments;
    }

    const p = this.degree;
    const U = this.kValues; // 完整 knot vector
    const m = this.fPoints.length;

    // 简单防御性检查
    if (!U || U.length === 0 || !this.cPoints || this.cPoints.length === 0) return bezierSegments;
    if (m < 2) return bezierSegments;

    for (let i = 0; i < m - 1; i++) {
      const a: VectorData = [this.fPoints[i].x, this.fPoints[i].y];
      const b: VectorData = [this.fPoints[i + 1].x, this.fPoints[i + 1].y];

      // 对应插值点参数 u_j 在完整 knot 向量中的位置为 U[p + j]
      const uLeft = U[p + i];
      const uRight = U[p + i + 1];

      // 防止相等或接近相等（极小间隔），定义 eps 为该区间宽度的极小比例
      const span = Math.max(TOLERANCE_SQ, Math.abs(uRight - uLeft));
      const eps = span * TOLERANCE_SQ;

      // 取右侧导数近似（避免落在左侧段）和左侧导数近似（避免落在右侧）
      const derivativeLeft = this.derivativeBSpline(uLeft + eps);   // dC/du at left (right-hand)
      const derivativeRight = this.derivativeBSpline(uRight - eps); // dC/du at right (left-hand)

      // 若 derivativeBSpline 返回 null/undefined，回退为零向量
      const d1: VectorData = derivativeLeft ? [derivativeLeft.x, derivativeLeft.y] : [0, 0];
      const d2: VectorData = derivativeRight ? [derivativeRight.x, derivativeRight.y] : [0, 0];

      // 方向向量（不需要单位化，但单位化能帮助数值稳健性）
      const v1: VectorData = normalize(d1);
      const v2: VectorData = normalize(d2);

      // 选取作为控制边的参考直线（用 cPoints[i+1] -> cPoints[i+2]）
      // 保护性索引判断
      const cpEdgeIdx = i + 1;
      let edgeBase: VectorData, edgeDir: VectorData;
      if (this.cPoints && this.cPoints[cpEdgeIdx] && this.cPoints[cpEdgeIdx + 1]) {
        edgeBase = [this.cPoints[cpEdgeIdx].x, this.cPoints[cpEdgeIdx].y];
        edgeDir = [this.cPoints[cpEdgeIdx + 1].x - edgeBase[0], this.cPoints[cpEdgeIdx + 1].y - edgeBase[1]];
      } else {
        // 回退：若没有足够的控制点，使用 a->b 作为边线方向
        edgeBase = [...a];
        edgeDir = [b[0] - a[0], b[1] - a[1]];
        if (edgeDir[0] === 0 && edgeDir[1] === 0) edgeDir = [TOLERANCE, 0]; // 防止 0 向量
      }

      // 计算 cp1：交点 = 交 (线 through a with dir v1) 与 (line through edgeBase with dir edgeDir)
      let cp1 = intersectLines(a, v1, edgeBase, edgeDir);
      if (!cp1) {
        // 平行或退化，退回到把 a 投影到控制边上
        cp1 = projectPointToLine(a, edgeBase, edgeDir);
      }

      // 计算 cp2：交点 = 交 (线 through b with dir v2) 与 (line through edgeBase with dir edgeDir)
      let cp2 = intersectLines(b, v2, edgeBase, edgeDir);
      if (!cp2) {
        // 退化处理：把 b 投影到控制边
        cp2 = projectPointToLine(b, edgeBase, edgeDir);
      }

      // 额外保护：如果 cp1 或 cp2 出现 NaN 或无限，退回到端点附近的安全值
      if (!isFinite(cp1.x) || !isFinite(cp1.y)) {
        cp1 = { x: a[0], y: a[1] };
      }
      if (!isFinite(cp2.x) || !isFinite(cp2.y)) {
        cp2 = { x: b[0], y: b[1] };
      }

      // 将构造的贝塞尔段加入结果（a,b,cp1,cp2）
      bezierSegments.push({a: {x: a[0], y: a[1]}, b: {x: b[0], y: b[1]}, cp1, cp2 });
    }

    return bezierSegments;
  }

  /**
   * Draw B-spline curves (converted to Bézier segments)
   */
  drawBSplineBezier(ctx: CanvasRenderingContext2D, scale: number) {
    const segments = this.bsplineToBezierSegments();
    ctx.beginPath();

    for (const seg of segments) {
      ctx.moveTo(seg.a.x, seg.a.y);
      ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.b.x, seg.b.y);
    }
    ctx.stroke();
  }

  drawBSplineBezierFull(ctx: CanvasRenderingContext2D, scale: number) {
    const segs = this.bsplineToBezierSegments_full();
    ctx.beginPath();
    for (const seg of segs) {
      ctx.moveTo(seg.cps[0].x, seg.cps[0].y);
      ctx.bezierCurveTo(seg.cps[1].x, seg.cps[1].y, seg.cps[2].x, seg.cps[2].y, seg.cps[3].x, seg.cps[3].y);
    }
    ctx.stroke();
  }

  drawBSplineLine(ctx: CanvasRenderingContext2D, scale: number) {
    if (!this.discretePointsWithScale[scale]) {
      this.updateDiscretePointsWithScale(scale);
    }
    const discretePoints = this.discretePointsWithScale[scale];
    const len = discretePoints.length;
    if (len === 0) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(discretePoints[0].x, discretePoints[0].y);
    for (const point of discretePoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Viewer) {
    // This function will be called multiple times to draw the image.
    const discreteScale = this.getDiscreteScale(scale);
    if (this.bSplineInterpolation.interpolation) {
      this.update(this.type, this.method);
      this.updateDiscretePointsWithScale(discreteScale);
    } else if (this.bSplineControlVertices.CVModel) {
      this.cvUpdate(this.type, this.method);
      this.updateDiscretePointsWithScale(discreteScale);
    } else {
      if (!this.discretePointsWithScale[discreteScale]) {
        this.updateDiscretePointsWithScale(discreteScale);
      }
    }
    // this.drawBSplineLine(ctx, discreteScale);
    if (this.degree > 3) {
      this.drawBSplineLine(ctx, discreteScale);
    } else {
      this.drawBSplineBezierFull(ctx, discreteScale);
    }
  }

  getDiscreteScale(scale: number) {
    let discreteScale = Math.ceil(Math.log2(scale));
    if (discreteScale > 3) {
      discreteScale = 8;
    } else if (discreteScale >= 1) {
      discreteScale = 2 ** discreteScale;
    } else {
      discreteScale = 2;
    }
    return discreteScale;
  }

  updateDiscretePointsWithScale(scale: number) {
    this.discretePointsWithScale[scale] = this.getDiscretePoints(scale);
  }

  write() {
    return {
      degree: this.degree,
      cPoints: this.transToIPoints(this.cPoints),
      fPoints: this.transToIPoints(this.fPoints),
      kValues: this.kValues,
      interpolation: this.bSplineInterpolation.interpolation, // If true, the interpolation method is manually drawn
      CVModel: this.bSplineControlVertices.CVModel,
    };
  }

  static read(id: string, bSplineData: IBSplineOpts) {
    return new BSpline(bSplineData, id);
  }

  drag(x, y, dx, dy) {
    this.dragging = true;
    this.translate(dx, dy);
  }

  stabilize(viewer: Viewer) {
    this.children.forEach((c) => c.stabilize(viewer));
  }
}

BSpline.prototype.TYPE = 'BSpline';

BSpline.prototype._class = 'TCAD.TWO.BSpline';

export const ParameterMethod = {
  QuasiUniform: 0,
  Centripetal: 1,
  ChordLength: 2,
}

export const BSplineType = {
  Clamped: "Clamped",
  Closed: "Closed",
  Open: "Open",
}

interface KnotsCalculator {
  calculate(modelPoints: EndPoint[], degree: number, type: string, method: number): number[];
}

abstract class BaseParameterMethod implements KnotsCalculator {
  abstract calculate(modelPoints: EndPoint[], degree: number, type: string, method: number): number[];

  protected chordOrCentripetalParameterize(modelPoints: EndPoint[], method: number): number[] {
    const n = modelPoints.length;
    const accumulated = [0.0];
    for (let i = 0; i < n - 1; ++i) {
      const dx = modelPoints[i + 1].x - modelPoints[i].x;
      const dy = modelPoints[i + 1].y - modelPoints[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // method 控制幂次：弦长=1，centripetal=0.5，均匀=0
      accumulated.push(accumulated[i] + Math.pow(dist, method === ParameterMethod.Centripetal ? 0.5 : 1));
    }
    const total = accumulated[accumulated.length - 1];
    return accumulated.map(v => v / total);
  }
}

export class GeneralKnotsCalculator extends BaseParameterMethod {
  calculate(modelPoints: EndPoint[], degree: number, type: string, method: number): number[] {
    const n = modelPoints.length;
    // 🧩 根据样条类型构造节点向量
    const kValues: number[] = [];

    if (type === BSplineType.Clamped) {
      // [0,0,0,...,均匀分布...,1,1,1]
      kValues.push(...new Array(degree).fill(0.0));
      switch (method) {
        case ParameterMethod.QuasiUniform:
          kValues.push(...Array.from({ length: n }, (_, i) => i / (n - 1)));
          break;
        case ParameterMethod.ChordLength:
        case ParameterMethod.Centripetal:
          kValues.push(...this.chordOrCentripetalParameterize(modelPoints, method));
          break;
        default:
          throw new Error("Unknown parameter method");
      }
      kValues.push(...new Array(degree).fill(1.0));
    } else if (type === BSplineType.Closed) {
      // 均匀分布，无端点重复
      const m = n + 2 * degree;
      for (let i = 0; i < m; ++i)
        kValues.push(i / (m - 1));
    } else if (type === BSplineType.Open) {
      // 均匀分布，无端点重复
      const m = n + degree;
      for (let i = 0; i <= m; ++i)
        kValues.push(i / m);
    }

    return kValues;
  }
}

export class CentripetalParameterMethod implements KnotsCalculator {
  calculate(modelPoints: EndPoint[], degree: number) {
    const n = modelPoints.length;
    const accumulatedLengths = [0.0];
    const knotValues = new Array(degree).fill(0.0);
    for (let i = 0; i < n - 1; ++i) {
      const lineLength = Math.sqrt(
        (modelPoints[i + 1].x - modelPoints[i].x) ** 2 + (modelPoints[i + 1].y - modelPoints[i].y) ** 2,
      );
      accumulatedLengths.push(accumulatedLengths[accumulatedLengths.length - 1] + Math.sqrt(lineLength));
    }
    for (let i = 0; i < n; ++i) {
      knotValues.push(accumulatedLengths[i] / accumulatedLengths[n - 1]);
    }
    knotValues.push(...new Array(degree).fill(1.0));
    return knotValues;
  }
}

export class CPointsCalculator {
  cPoints: Array<{ x: number; y: number; z: 0 }>;
  knotValues: number[];
  degree: number;
  modelPoints: EndPoint[];

  constructor() {
    this.cPoints = [];
    this.knotValues = [];
    this.degree = 3;
    this.modelPoints = [];
  }

  setup(knotValues: number[], modelPoints: EndPoint[], degree: number) {
    this.knotValues = knotValues;
    this.degree = degree;
    this.modelPoints = modelPoints;
    const x = this.modelPoints.length;
    // if (x < this.degree) {
    //   throw new Error("too less points !");
    // }
  }

  calculate(type: string) {
    const m = this.modelPoints.length;
    const p = this.degree;
    const n = m + p - 1; // #control points
    const U = this.knotValues;

    // 基本合法性检查
    if (!U || U.length === 0) {
      throw new Error("knotValues 为空");
    }
    // 检查 U 长度是否与期望一致（n + p + 1）
    if (U.length !== n + p + 1) {
      // 仅作警告或抛错，根据你的需求选择
      console.warn(`警告：knotValues.length=${U.length}, 但期望为 n + p + 1 = ${n + p + 1}. 请确认 knot vector 是否正确.`);
      // 你可以选择抛错： throw new Error(...)
    }

    // 判断是否首尾相同（用于 Closed 情形）
    const first = this.modelPoints[0];
    const last = this.modelPoints[m - 1];
    const isDuplicateEnd = arePointsEqual(first, last, TOLERANCE);

    // 若用户指定 Clamped 但首尾相同，我们自动切为 Closed
    let actualType = type;
    if (type === BSplineType.Clamped && isDuplicateEnd) {
      actualType = BSplineType.Closed;
    }
    // 基础矩阵/向量
    const matrixN = Array.from({ length: n }, () => Array(n).fill(0));
    const matrixFX = [];
    const matrixFY = [];

    // 先准备 Bessel 切向（用于一阶端点导数）
    // const start = new BesselTangentMethod();
    // start.calculate(this.modelPoints[0], this.modelPoints[1], this.modelPoints[2]);
    // const end = new BesselTangentMethod();
    // const mp = this.modelPoints;
    // end.calculate(mp[mp.length - 3], mp[mp.length - 2], mp[mp.length - 1]);
    // const { startTangent } = start;
    // const { endTangent } = end;
    // ====== 填插值方程 ======
    // 对于 Closed 且末点是重复的，我们只建立 m-1 条插值方程（跳过最后一条冗余方程）
    const interpCount = (actualType === BSplineType.Closed && isDuplicateEnd) ? (m - 1) : m;
    // 1) 插值方程： j = 0..m-1 对应 u_j = U[p + j]
    for (let j = 0; j < interpCount; j++) {
      const uj = U[p + j];
      const basis0 = basisDerivativesAll(U, p, uj, 0, n)[0]; // 0阶基函数全量向量
      for (let i = 0; i < n; i++) {
        matrixN[j][i] = basis0[i] || 0;
      }
      matrixFX[j] = this.modelPoints[j].x;
      matrixFY[j] = this.modelPoints[j].y;
    }

    let row = interpCount; // 从第 m 行开始填充

    if (type === BSplineType.Clamped) {
      // 2) 额外的 p-1 条端点导数约束：分配到左/右两端
      const extra = p - 1;
      const leftCnt = Math.floor(extra / 2);
      const rightCnt = extra - leftCnt;
      
      // 左端：r = 1..leftCnt
      for (let r = 1; r <= leftCnt; r++, row++) {
        // 计算 r 阶基函数导数在 u_left = U[p]（通常是首个有效参数）
        const uLeft = U[p];
        const ders = basisDerivativesAll(U, p, uLeft, r, n); // ders[r][i]
        for (let i = 0; i < n; i++) {
          matrixN[row][i] = ders[r][i] || 0;
        }
        // RHS: r=1 用 Bessel 切向并适当缩放（沿用你原来的缩放因子），r>1 默认为 0（natural）
        matrixFX[row] = 0;
        matrixFY[row] = 0;
      }

      // 右端： r = 1..rightCnt （在 uRight = U[n] 或 U[U.length-p-?]）
      // 右侧参数取 uRight = U[n] = U[ (nControlPts - 1) + p? ] 一般安全用 U[U.length - p - 1]
      const uRight = U[U.length - p - 1]; // 终端有效参数
      for (let r = 1; r <= rightCnt; r++, row++) {
        const ders = basisDerivativesAll(U, p, uRight, r, n);
        for (let i = 0; i < n; i++) {
          matrixN[row][i] = ders[r][i] || 0;
        }
        // 你原来对 end 切向做了相似缩放
        matrixFX[row] = 0;
        matrixFY[row] = 0;
      }
    }
    else if (type === BSplineType.Closed) {
      /// Closed：添加 p 条周期性连续约束 r=0..p-1
      // 注意：若插值方程已经跳过了重复的最后一个点（interpCount = origM - 1），
      //       则插值方程 + 这 p 条约束的总数会等于 n（方阵）。
      const u0 = U[p]; // left valid parameter
      const uEnd = U[U.length - p - 1]; // right valid parameter
      for (let r = 0; r < p; r++, row++) {
        const d0 = basisDerivativesAll(U, p, u0, r, n)[r];
        const dE = basisDerivativesAll(U, p, uEnd, r, n)[r];
        const rowVec = d0.map((v, i) => (v || 0) - (dE[i] || 0));
        matrixN[row] = rowVec;
        matrixFX[row] = 0;
        matrixFY[row] = 0;
      }
    }
    // 最后校验：已填行数应等于 n
    if (row !== n) {
      throw new Error(`方程行数与未知数不匹配：已填行 ${row}, 期望 n = ${n}. （type=${actualType}，origM=${m}, p=${p}）`);
    }
    // row 应当等于 n 了
    // 求解线性系统 matrixN * PX = matrixFX
    const matrixPX = lu_solve(matrixN, matrixFX, false);
    const matrixPY = lu_solve(matrixN, matrixFY, false);

    this.cPoints = [];
    for (let i = 0; i < n; ++i) {
      this.cPoints[i] = { x: matrixPX[i], y: matrixPY[i], z: 0 };
    }
    return this.cPoints;
  }
}

// ---------- 辅助： 查区间 ----------
function findSpan(U: number[], p: number, u: number): number {
  const m = U.length - 1;
  const n = m - p - 1; // n = #controlPoints - 1
  if (u >= U[n + 1]) return n;
  if (u <= U[p]) return p;
  let low = p, high = n + 1, mid = Math.floor((low + high) / 2);
  while (u < U[mid] || u >= U[mid + 1]) {
    if (u < U[mid]) high = mid; else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

// ---------- DersBasisFuns：返回 ders[r][j] (0<=r<=nd, 0<=j<=p)
// 参考 The NURBS Book A2.3 算法（计算基函数及其导数）
function DersBasisFuns(i: number, u: number, p: number, nd: number, U: number[]) {
  const ndu: number[][] = Array.from({ length: p + 1 }, () => Array(p + 1).fill(0));
  const left = Array(p + 1).fill(0);
  const right = Array(p + 1).fill(0);
  ndu[0][0] = 1.0;
  for (let j = 1; j <= p; j++) {
    left[j] = u - U[i + 1 - j];
    right[j] = U[i + j] - u;
    let saved = 0.0;
    for (let r = 0; r < j; r++) {
      ndu[j][r] = right[r + 1] + left[j - r];
      const temp = ndu[r][j - 1] / ndu[j][r];
      ndu[r][j] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }
    ndu[j][j] = saved;
  }

  const ders: number[][] = Array.from({ length: nd + 1 }, () => Array(p + 1).fill(0));
  for (let j = 0; j <= p; j++) ders[0][j] = ndu[j][p];

  const a: number[][] = Array.from({ length: p + 1 }, () => Array(p + 1).fill(0));

  for (let r = 0; r <= p; r++) {
    let s1 = 0, s2 = 1;
    a[0][0] = 1.0;
    for (let k = 1; k <= nd; k++) {
      let d = 0.0;
      const rk = r - k;
      const pk = p - k;
      if (rk >= 0) {
        a[s2][0] = a[s1][0] / ndu[pk + 1][rk];
        d = a[s2][0] * ndu[rk][pk];
      }
      const j1 = rk >= -1 ? 1 : -rk;
      const j2 = (r - 1 <= pk) ? k - 1 : p - r;
      for (let j = j1; j <= j2; j++) {
        const val = (a[s1][j] || 0) - (a[s1][j - 1] || 0);
        a[s2][j] = val / ndu[pk + 1][rk + j];
        d += a[s2][j] * ndu[rk + j][pk];
      }
      if (r <= pk) {
        a[s2][k] = - (a[s1][k - 1] || 0) / ndu[pk + 1][r];
        d += a[s2][k] * ndu[r][pk];
      }
      ders[k][r] = d;
      // swap s1,s2
      const tmp = s1; s1 = s2; s2 = tmp;
    }
  }

  // multiply by factorial factor: ders[k][j] *= p! / (p-k)!
  const factorial = (m: number) => {
    let f = 1;
    for (let t = 2; t <= m; t++) f *= t;
    return f;
  };
  for (let k = 1; k <= nd; k++) {
    const factor = factorial(p) / factorial(p - k);
    for (let j = 0; j <= p; j++) ders[k][j] *= factor;
  }

  return ders; // ders[0..nd][0..p], where index j corresponds to basis index (i-p+j)
}

// ---------- wrapper: 返回基函数及其导数的“全量向量”
// 返回：arr[r][globalIndex] （0<=r<=nd, 0<=globalIndex<=n-1）
function basisDerivativesAll(U: number[], p: number, u: number, nd: number, nControlPoints: number) {
  const span = findSpan(U, p, u);
  const ders = DersBasisFuns(span, u, p, nd, U); // ders[r][j] j=0..p maps to global index span-p+j
  const res: number[][] = Array.from({ length: nd + 1 }, () => Array(nControlPoints).fill(0));
  for (let r = 0; r <= nd; r++) {
    for (let j = 0; j <= p; j++) {
      const idx = span - p + j; // global control point index
      if (idx >= 0 && idx < nControlPoints) {
        res[r][idx] = ders[r][j];
      }
    }
  }
  return res;
}

// 相对接近判断（更健壮地代替绝对容差）
function nearlyEqualRel(a: number, b: number, relTol = 1e-9) {
  return Math.abs(a - b) <= relTol * Math.max(1, Math.abs(a), Math.abs(b));
}

// 向量线求交：P0 + t*v0 与 Q0 + s*v1，返回交点或 null（平行或近似平行）
function intersectLines(P0: VectorData, v0: VectorData,
                        Q0: VectorData, v1: VectorData,
                        tol = 1e-12) {
  const denom = cross2d(v0, v1);
  if (Math.abs(denom) < tol) {
    return null; // parallel or nearly parallel
  }
  const w: VectorData = [Q0[0] - P0[0], Q0[1] - P0[1]];
  const t = cross2d(w, v1) / denom;
  return { x: P0[0] + t * v0[0], y: P0[1] + t * v0[1] };
}

// 把点投影到由 base->dir 定义的直线上（返回投影点）
function projectPointToLine(pt: VectorData, base: VectorData, dir: VectorData) {
  const v = { x: pt[0] - base[0], y: pt[1] - base[1] };
  const dlen2 = dir[0] * dir[0] + dir[1] * dir[1];
  if (dlen2 === 0) return { x: base[0], y: base[1] };
  const t = (v.x * dir[0] + v.y * dir[1]) / dlen2;
  return { x: base[0] + t * dir[0], y: base[1] + t * dir[1] };
}

class BesselTangentMethod {
  // 三个点用通过二次贝塞尔曲线，中间点的t值为0.5
  startTangent: EndPoint;
  middleTangent: EndPoint;
  endTangent: EndPoint;

  calculate(pointA: EndPoint, pointB: EndPoint, pointC: EndPoint) {
    const distanceAB = Math.sqrt((pointB.x - pointA.x) ** 2 + (pointB.y - pointA.y) ** 2);
    const distanceBC = Math.sqrt((pointC.x - pointB.x) ** 2 + (pointC.y - pointB.y) ** 2);
    const sum = distanceAB + distanceBC;
    const deltaAB = new EndPoint((pointB.x - pointA.x) / distanceAB, (pointB.y - pointA.y) / distanceAB);
    const deltaBC = new EndPoint((pointC.x - pointB.x) / distanceBC, (pointC.y - pointB.y) / distanceBC);
    this.middleTangent = new EndPoint(
      (distanceAB / sum) * deltaAB.x + (distanceBC / sum) * deltaBC.x,
      (distanceAB / sum) * deltaAB.y + (distanceBC / sum) * deltaBC.y,
    );
    this.startTangent = new EndPoint(2 * deltaAB.x - this.middleTangent.x, 2 * deltaAB.y - this.middleTangent.y);
    this.endTangent = new EndPoint(2 * deltaBC.x - this.middleTangent.x, 2 * deltaBC.y - this.middleTangent.y);
  }
}
