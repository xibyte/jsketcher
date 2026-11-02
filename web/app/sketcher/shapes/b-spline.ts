import { EndPoint } from "./point";
import { Segment } from "./segment";
import { Param } from "./param";
import Vector from "math/vector";
import { SketchObject } from "./sketch-object";
import { Layer, Viewer } from "../viewer2d";
import { TOLERANCE, TOLERANCE_SQ, areEqual, arePointsEqual } from "math/equality";
import { VectorData, cross2d, normalize } from "math/vec";
import { distanceAB } from "math/distance";
import { lu_solve } from "math/optim/dogleg";
import { isPointInsidePolygon, polygonOffset, ConvexHull2D } from "geom/euclidean";

type IPolynomialFunc = (t: number) => number;
type IPoint = { x: number; y: number; id?: string };
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
    // Note: type === Closed is handled directly by BSpline.cvUpdateClosed (wrap + Boehm conversion to clamped),
    //       so it never reaches this code; this handles Clamped only.
    const cPoints = [];
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
  // Closed CV mode only: the original user-selected control points (ordered and unique).
  // In Closed mode, cPoints contains derived clamped points (m+p new EndPoints) with no one-to-one correspondence to the user points;
  // serialize the user points separately to restore their draggable positions and constraint IDs when reopening the sketch.
  closedBasePoints?: IPoint[];
}

export class BSpline extends SketchObject {
  ctx: CanvasRenderingContext2D | undefined;

  scale: number;

  degree: number;

  type: string;

  method: number;

  order: number;

  cPoints: EndPoint[]; // Spline control points (used for basis-function evaluation; replaced with Boehm-clamped points in Closed mode)

  // Closed CV mode only: original user-selected points (ordered). periodicToClamped rebuilds cPoints/kValues from them each frame.
  // These are independent of cPoints: user drag/add/remove operations edit them; cPoints is derived rendering data.
  closedBasePoints: EndPoint[] = [];

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

  baseLength: number; // normalized distance for each discrete point

  dragging: boolean = false;

  constructor(opts: IBSplineOpts, id?: string, ctx?: CanvasRenderingContext2D, scale?: number) {
    super(id);
    this.ctx = ctx;
    this.scale = scale || 1;
    this.degree = opts.degree;
    this.order = this.degree + 1;
    this.type = opts.type ? opts.type : BSplineType.Clamped;
    this.method = opts.method ?? -1;
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

    this.cPoints = opts.cPoints as EndPoint[];
    this.fPoints = opts.fPoints as EndPoint[];
    this.setChildPoint([...this.cPoints, ...this.fPoints]);

    this.kValues = opts.kValues;
    this.updateKnots();

    this.bSplinePolynomial = new BSplinePolynomial(this.kValues, this.order);
    const newKValues = this.kValues.slice(1, this.kValues.length - 1);
    this.derivativePolynomial = new BSplinePolynomial(newKValues, this.order - 1);
    this.bSplineInterpolation = new BSplineInterpolation(this.degree, opts.interpolation);
    this.bSplineControlVertices = new BSplineControlVertices(this.degree, opts.CVModel);
    if (opts.interpolation) {
      // this.type = BSplineType.Clamped;
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
    // Basis functions use half-open knot intervals. Evaluate the right endpoint
    // explicitly; otherwise the exact final knot returns the origin.
    if (t === this.kValues[this.cPoints.length]) {
      const degree = this.degree, knots = this.kValues;
      let span = this.cPoints.length - 1;
      while (span > degree && knots[span] >= t) --span;
      const points = Array.from({length: degree + 1}, (_, j) => {
        const point = this.cPoints[span - degree + j];
        return {x: point.x, y: point.y};
      });
      for (let level = 1; level <= degree; ++level) {
        for (let j = degree; j >= level; --j) {
          const index = span - degree + j;
          const divisor = knots[index + degree - level + 1] - knots[index];
          const ratio = divisor === 0 ? 0 : (t - knots[index]) / divisor;
          points[j] = {x: (1 - ratio) * points[j - 1].x + ratio * points[j].x,
                       y: (1 - ratio) * points[j - 1].y + ratio * points[j].y};
        }
      }
      return points[degree];
    }
    let x = 0;
    let y = 0;
    for (let index = 0; index < this.numberOfControlPoints; ++index) {
      const ratio = this.bSplinePolynomial.get(index)(t);
      x += ratio * this.cPoints[index].x;
      y += ratio * this.cPoints[index].y;
    }
    return { x, y };
  }

  basisFunction(i: number, p: number, u: number, knots: number[]): number {
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
    this.children.delete(point);
    // this.children.forEach((item, index) => {
    //   if (item === point) {
    //     this.children.splice(index, 1);
    //   }
    // });
  }

  setChildPoint(points: EndPoint[]) {
    this.children = new Set(points);
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
    // In Closed CV mode, closedBasePoints tracks the original user-selected points (one per click)
    this.closedBasePoints.push(point);
  }

  removeCPoint() {
    const num = Math.floor(this.degree / 2) + 1;
    if (this.cPoints.length < num) {
      return;
    }
    for (let i = 0; i < num; i++) {
      const point = this.cPoints.pop() as EndPoint;
      point.visible = false;
      this.removeChildPoint(point);
    }
    if (this.closedBasePoints.length) {
      this.closedBasePoints.pop();
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
    if (!this.fPoints.length) {
      return;
    }
    const point = this.fPoints.pop() as EndPoint;
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
    this.fPoints[this.fPoints.length - 1].x = this.cPoints[this.cPoints.length - 1].x;
    this.fPoints[this.fPoints.length - 1].y = this.cPoints[this.cPoints.length - 1].y;
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
    if (type === BSplineType.Closed) {
      this.cvUpdateClosed(method);
      this.type = type;
      this.method = method;
      return;
    }
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

  /**
   * Refreshing Closed CV mode:
   * - closedBasePoints contains the user-selected base points (ordered and unique);
   * - each refresh wraps them, generates uniform knots, applies Boehm insertion and trims to obtain a clamped representation;
   * - write the resulting m+p control points and m+2p+1 clamped knots to this.cPoints / this.kValues for basis evaluation;
   * - children (visible and draggable by the user) always contains closedBasePoints, independently of cPoints.
   */
  cvUpdateClosed(method: number) {
    // Fallback: if old serialized data has no closedBasePoints, recover unique points from cPoints (with addCPoint duplicates)
    if (this.closedBasePoints.length === 0 && this.cPoints.length > 0) {
      const seen = new Set<EndPoint>();
      for (const p of this.cPoints) {
        if (!seen.has(p)) {
          seen.add(p);
          this.closedBasePoints.push(p);
        }
      }
    }

    const p = this.degree;
    const base = this.closedBasePoints;
    if (base.length < 2) {
      return;
    }

    const baseXY = base.map((pt) => ({ x: pt.x, y: pt.y }));
    const { P, U } = periodicToClamped(baseXY, p);

    // Replace cPoints with derived EndPoint instances (used only for evaluation, not dragging)
    const derived: EndPoint[] = P.map((pt) => {
      const ep = new EndPoint(pt.x, pt.y);
      ep.visible = false;
      return ep;
    });
    this.cPoints = derived;
    this.numberOfControlPoints = derived.length;

    // Store the clamped knots
    this.setKValues(U);

    // children = original user-selected points, which can be dragged
    this.setChildPoint([...base]);

    // Synchronize fPoints and the start/end points
    this.setFPointWithCVModel();
    this.setPointA(this.cPoints[0]);
    this.setPointB(this.cPoints[this.cPoints.length - 1]);
  }

  getDiscretePoints(scale: number) {
    const discretePoints: IPoint[] = [];
    for (let index = 0; index < this.knots.length - 1; ++index) {
      const f0 = this.getPoint(this.knots[index]);
      const f1 = this.getPoint(this.knots[index + 1]);
      const normalizedDistance = distanceAB(f0, f1) * scale;
      const step = ((this.knots[index + 1] - this.knots[index]) * this.baseLength) / normalizedDistance;
      discretePoints.push(f0);
      for (let k = this.knots[index] + step; k < this.knots[index + 1]; k += step) {
        const p = this.getPoint(k);
        discretePoints.push(p);
      }
    }
    discretePoints.push(this.b);
    return discretePoints;
  }

  visitParams(callback: (param: Param) => void) {
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

  transToEndPoints(points: IPoint[]): EndPoint[] {
    const endPoints = [];
    for (const point of points) {
      endPoints.push(new EndPoint(point.x, point.y, point.id));
    }
    return endPoints;
  }

  transToIPoints(points: EndPoint[]): IPoint[] {
    const IPoints = [];
    for (const point of points) {
      IPoints.push({ x: point.x, y: point.y, id: point.id });
    }
    return IPoints;
  }

  /** Deep-copy the point array (preserving x and y) */
  private clonePointsArray(points: { x: number; y: number }[]): { x: number; y: number }[] {
    return points.map((p) => ({ x: p.x, y: p.y }));
  }

  /** Count the multiplicity of u in the knot vector (with a small tolerance) */
  private knotMultiplicity(U: number[], u: number, eps = 1e-12): number {
    let count = 0;
    for (const v of U) if (Math.abs(v - u) <= eps) count++;
    return count;
  }

  /**
   * findSpan: return k such that U[k] <= u < U[k+1]
   * If u equals the right endpoint, return n (#controlPoints - 1)
   */
  private findSpan(U: number[], p: number, u: number): number {
    const m = U.length - 1;
    const n = m - p - 1; // n = #controlPoints - 1
    if (u >= U[n + 1]) return n;
    if (u <= U[p]) return p;
    let low = p,
      high = n + 1;
    let mid = Math.floor((low + high) / 2);
    while (u < U[mid] || u >= U[mid + 1]) {
      if (u < U[mid]) high = mid;
      else low = mid;
      mid = Math.floor((low + high) / 2);
    }
    return mid;
  }

  /**
   * Insert one knot (Boehm/Piegl & Tiller local update)
   * Do not modify the inputs; return { P: newPoints, U: newKnots }
   */
  private insertKnotSingle(P_in: { x: number; y: number }[], U_in: number[], p: number, u: number) {
    // working copies
    const P = this.clonePointsArray(P_in);
    const U = U_in.slice();

    // sanity check: U.length must be P.length + p + 1
    if (U.length !== P.length + p + 1) {
      throw new Error(
        `Invalid input sizes: U.length=${U.length}, P.length=${P.length}, p=${p}. Expect U.length == P.length + p + 1`,
      );
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
        y: (1 - a) * P[i - 1].y + a * P[i].y,
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
   * Insert u into P, U the specified number of times (using insertKnotSingle each time)
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
   * Convert the current spline (this.cPoints, this.kValues, this.degree) to equivalent degree-p Bézier segments
   * A cubic B-spline becomes cubic Bézier curves; similarly for degree 4, 5, ...
   * Return an array of { cps: [p+1 {x,y} points], u0, u1 }
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
   * Revised bsplineToBezierSegments: use the full kValues, vector intersections, and relative tolerance
   * A geometry-based method discovered by the author for converting cubic splines to cubic Bézier curves
   */
  bsplineToBezierSegments() {
    const bezierSegments: Array<{ a: any; b: any; cp1: any; cp2: any }> = [];

    if (this.type === BSplineType.Closed) {
      // This can be extended for closed curves; the current behavior handles non-closed curves only
      return bezierSegments;
    }

    const p = this.degree;
    const U = this.kValues; // full knot vector
    const m = this.fPoints.length;

    // Basic defensive check
    if (!U || U.length === 0 || !this.cPoints || this.cPoints.length === 0) return bezierSegments;
    if (m < 2) return bezierSegments;

    for (let i = 0; i < m - 1; i++) {
      const a: VectorData = [this.fPoints[i].x, this.fPoints[i].y];
      const b: VectorData = [this.fPoints[i + 1].x, this.fPoints[i + 1].y];

      // The parameter u_j of the corresponding interpolation point is U[p + j] in the full knot vector
      const uLeft = U[p + i];
      const uRight = U[p + i + 1];

      // To avoid equal or nearly equal values, set eps to a small fraction of the interval width
      const span = Math.max(TOLERANCE_SQ, Math.abs(uRight - uLeft));
      const eps = span * TOLERANCE_SQ;

      // Approximate the right derivative (avoiding the left segment) and the left derivative (avoiding the right segment)
      const derivativeLeft = this.derivativeBSpline(uLeft + eps); // dC/du at left (right-hand)
      const derivativeRight = this.derivativeBSpline(uRight - eps); // dC/du at right (left-hand)

      // Fall back to the zero vector if derivativeBSpline returns null/undefined
      const d1: VectorData = derivativeLeft ? [derivativeLeft.x, derivativeLeft.y] : [0, 0];
      const d2: VectorData = derivativeRight ? [derivativeRight.x, derivativeRight.y] : [0, 0];

      // Direction vectors (normalization is optional but improves numerical stability)
      const v1: VectorData = normalize(d1);
      const v2: VectorData = normalize(d2);

      // Choose the reference line for the control edge (cPoints[i+1] -> cPoints[i+2])
      // Defensive index check
      const cpEdgeIdx = i + 1;
      let edgeBase: VectorData, edgeDir: VectorData;
      if (this.cPoints && this.cPoints[cpEdgeIdx] && this.cPoints[cpEdgeIdx + 1]) {
        edgeBase = [this.cPoints[cpEdgeIdx].x, this.cPoints[cpEdgeIdx].y];
        edgeDir = [this.cPoints[cpEdgeIdx + 1].x - edgeBase[0], this.cPoints[cpEdgeIdx + 1].y - edgeBase[1]];
      } else {
        // Fallback: if there are too few control points, use a->b as the edge direction
        edgeBase = [...a];
        edgeDir = [b[0] - a[0], b[1] - a[1]];
        if (edgeDir[0] === 0 && edgeDir[1] === 0) edgeDir = [TOLERANCE, 0]; // avoid a zero vector
      }

      // Compute cp1 as the intersection of (line through a with dir v1) and (line through edgeBase with dir edgeDir)
      let cp1 = intersectLines(a, v1, edgeBase, edgeDir);
      if (!cp1) {
        // If parallel or degenerate, fall back to projecting a onto the control edge
        cp1 = projectPointToLine(a, edgeBase, edgeDir);
      }

      // Compute cp2 as the intersection of (line through b with dir v2) and (line through edgeBase with dir edgeDir)
      let cp2 = intersectLines(b, v2, edgeBase, edgeDir);
      if (!cp2) {
        // For a degenerate case, project b onto the control edge
        cp2 = projectPointToLine(b, edgeBase, edgeDir);
      }

      // Additional guard: if cp1 or cp2 contains NaN or infinity, fall back to safe values near the endpoints
      if (!isFinite(cp1.x) || !isFinite(cp1.y)) {
        cp1 = { x: a[0], y: a[1] };
      }
      if (!isFinite(cp2.x) || !isFinite(cp2.y)) {
        cp2 = { x: b[0], y: b[1] };
      }

      // Add the constructed Bézier segment to the result (a,b,cp1,cp2)
      bezierSegments.push({ a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] }, cp1, cp2 });
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
    const isClosedCV =
      this.type === BSplineType.Closed && this.bSplineControlVertices.CVModel && this.closedBasePoints.length > 0;
    return {
      degree: this.degree,
      cPoints: this.transToIPoints(this.cPoints),
      fPoints: this.transToIPoints(this.fPoints),
      kValues: this.kValues,
      interpolation: this.bSplineInterpolation.interpolation, // If true, the interpolation method is manually drawn
      CVModel: this.bSplineControlVertices.CVModel,
      type: this.type,
      method: this.method,
      // In Closed CV mode cPoints contains derived clamped points; actual user-selected points remain in closedBasePoints
      ...(isClosedCV ? { closedBasePoints: this.transToIPoints(this.closedBasePoints) } : {}),
    };
  }

  static read(id: string, data: IBSplineOpts) {
    const cPoints: EndPoint[] = [];
    const fPoints: EndPoint[] = [];
    const cMap: Map<string, EndPoint> = new Map();
    const fMap: Map<string, EndPoint> = new Map();
    // Saved cPoints in Closed CV mode are derived clamped points (not visible or draggable); user points are in closedBasePoints
    const isClosedCVData =
      data.type === BSplineType.Closed && data.CVModel && data.closedBasePoints && data.closedBasePoints.length > 0;
    if (data.interpolation || data.CVModel) {
      data.fPoints.forEach((p) => {
        if (fMap.has(p.id as string)) {
          fPoints.push(fMap.get(p.id as string) as EndPoint);
        } else {
          const f = new EndPoint(p.x, p.y, p.id);
          f.visible = data.interpolation;
          fPoints.push(f);
          fMap.set(p.id as string, f);
        }
      });
      data.cPoints.forEach((p) => {
        if (cMap.has(p.id as string)) {
          cPoints.push(cMap.get(p.id as string) as EndPoint);
        } else {
          const c = new EndPoint(p.x, p.y, p.id);
          c.visible = data.CVModel && !isClosedCVData;
          cPoints.push(c);
          cMap.set(p.id as string, c);
        }
      });
    } else {
      let i = 0;
      data.fPoints.forEach((p) => {
        const s = `${p.x}_${p.y}`;
        if (fMap.has(s)) {
          fPoints.push(fMap.get(s) as EndPoint);
        } else {
          const fPointId = `spline${id}_fPoint${i}`;
          const fPoint = new EndPoint(p.x, p.y, fPointId);
          fPoint.visible = false;
          fPoints.push(fPoint);
          fMap.set(s, fPoint);
          i++;
        }
      });
      let j = 0;
      data.cPoints.forEach((p) => {
        const s = `${p.x}_${p.y}`;
        if (cMap.has(s)) {
          cPoints.push(cMap.get(s) as EndPoint);
        } else {
          const cPointId = `spline${id}_cPoint${j}`;
          const cPoint = new EndPoint(p.x, p.y, cPointId);
          cPoint.visible = false;
          cPoints.push(cPoint);
          cMap.set(s, cPoint);
          j++;
        }
      });
    }
    const bSplineData: IBSplineOpts = {
      degree: data.degree,
      cPoints,
      fPoints,
      kValues: data.kValues,
      interpolation: data.interpolation,
      CVModel: data.CVModel,
      type: data.type || BSplineType.Clamped,
      method: data.method ?? ParameterMethod.Centripetal,
    };
    const bSpline = new BSpline(bSplineData, id);

    // Closed CV mode: restore original user-selected control points (preserving IDs for constraint links).
    // - If data.closedBasePoints exists, create new EndPoints from it and preserve their IDs.
    // - If data uses the old format (without closedBasePoints) but is Closed CV, leave it empty;
    //   cvUpdateClosed will recover it from cPoints as a fallback, deduplicating by reference.
    if (bSpline.type === BSplineType.Closed && data.CVModel && data.closedBasePoints && data.closedBasePoints.length) {
      const baseMap: Map<string, EndPoint> = new Map();
      const base: EndPoint[] = [];
      for (const bp of data.closedBasePoints) {
        const key = bp.id as string;
        let ep = baseMap.get(key);
        if (!ep) {
          ep = new EndPoint(bp.x, bp.y, bp.id);
          ep.visible = true;
          baseMap.set(key, ep);
        }
        base.push(ep);
      }
      bSpline.closedBasePoints = base;
      // On the first frame cvUpdateClosed sets children using setChildPoint([...base]) and rebuilds derived cPoints;
      // attach base to children now so it is visible beforehand (for example, during constraint-system initialization).
      for (const p of base) {
        p.parent = bSpline;
        bSpline.children.add(p);
      }
    }

    return bSpline;
  }

  drag(x: number, y: number, dx: number, dy: number) {
    this.dragging = true;
    this.translate(dx, dy);
  }

  stabilize(viewer: Viewer) {
    this.children.forEach((c) => c.stabilize(viewer));
  }
}

BSpline.prototype.TYPE = "BSpline";

BSpline.prototype._class = "TCAD.TWO.BSpline";

export const ParameterMethod = {
  QuasiUniform: 0,
  Centripetal: 1,
  ChordLength: 2,
};

export const BSplineType = {
  Clamped: "Clamped",
  Closed: "Closed",
  Open: "Open",
};

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
      // method controls the exponent: chord length=1, centripetal=0.5, uniform=0
      accumulated.push(accumulated[i] + Math.pow(dist, method === ParameterMethod.Centripetal ? 0.5 : 1));
    }
    const total = accumulated[accumulated.length - 1];
    return accumulated.map((v) => v / total);
  }
}

export class GeneralKnotsCalculator extends BaseParameterMethod {
  calculate(modelPoints: EndPoint[], degree: number, type: string, method: number): number[] {
    const n = modelPoints.length;
    // Build the knot vector according to spline type
    const kValues: number[] = [];

    if (type === BSplineType.Clamped || type === BSplineType.Closed) {
      // [0,0,0,...,uniformly distributed...,1,1,1]
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
    }
    // else if (type === BSplineType.Closed) {
    //   // Uniform distribution without repeated endpoints
    //   const m = n + 2 * degree;
    //   for (let i = 0; i < m; ++i) kValues.push(i / (m - 1));
    // }
    else if (type === BSplineType.Open) {
      // Uniform distribution without repeated endpoints
      const m = n + degree;
      for (let i = 0; i <= m; ++i) kValues.push(i / m);
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

    // Basic validity checks
    if (!U || U.length === 0) {
      throw new Error("knotValues is empty");
    }
    // Check that the length of U matches the expected n + p + 1
    if (U.length !== n + p + 1) {
      // Warn or throw, depending on requirements
      console.warn(
        `Warning: knotValues.length=${U.length}, but expected n + p + 1 = ${n + p + 1}. Check the knot vector.`,
      );
      // Alternatively throw an error: throw new Error(...)
    }

    // Check whether the first and last points match (for Closed mode)
    const first = this.modelPoints[0];
    const last = this.modelPoints[m - 1];
    const isDuplicateEnd = arePointsEqual(first, last, TOLERANCE);

    // If the user specifies Clamped but the endpoints match, automatically switch to Closed
    let actualType = type;
    if (type === BSplineType.Clamped && isDuplicateEnd) {
      actualType = BSplineType.Closed;
    }
    // Base matrices/vectors
    const matrixN = Array.from({ length: n }, () => Array(n).fill(0));
    const matrixFX = [];
    const matrixFY = [];

    // First prepare Bessel tangents (for first-order endpoint derivatives)
    // const start = new BesselTangentMethod();
    // start.calculate(this.modelPoints[0], this.modelPoints[1], this.modelPoints[2]);
    // const end = new BesselTangentMethod();
    // const mp = this.modelPoints;
    // end.calculate(mp[mp.length - 3], mp[mp.length - 2], mp[mp.length - 1]);
    // const { startTangent } = start;
    // const { endTangent } = end;
    // ====== Fill in interpolation equations ======
    // For Closed curves with a repeated final point, create only m-1 interpolation equations (skip the redundant final equation)
    const interpCount = actualType === BSplineType.Closed && isDuplicateEnd ? m - 1 : m;
    // 1) Interpolation equations: j = 0..m-1 corresponds to u_j = U[p + j]
    for (let j = 0; j < interpCount; j++) {
      const uj = U[p + j];
      const basis0 = basisDerivativesAll(U, p, uj, 0, n)[0]; // full vector of zeroth-order basis functions
      for (let i = 0; i < n; i++) {
        matrixN[j][i] = basis0[i] || 0;
      }
      matrixFX[j] = this.modelPoints[j].x;
      matrixFY[j] = this.modelPoints[j].y;
    }

    let row = interpCount; // fill starting at row m

    if (type === BSplineType.Clamped) {
      // 2) Additional p-1 endpoint derivative constraints, distributed between the left and right endpoints
      const extra = p - 1;
      const leftCnt = Math.floor(extra / 2);
      const rightCnt = extra - leftCnt;

      // Left endpoint: r = 1..leftCnt
      for (let r = 1; r <= leftCnt; r++, row++) {
        // Evaluate the r-th basis-function derivative at u_left = U[p] (usually the first valid parameter)
        const uLeft = U[p];
        const ders = basisDerivativesAll(U, p, uLeft, r, n); // ders[r][i]
        for (let i = 0; i < n; i++) {
          matrixN[row][i] = ders[r][i] || 0;
        }
        // RHS: for r=1 use the Bessel tangent with the original scaling factor; for r>1 default to 0 (natural)
        matrixFX[row] = 0;
        matrixFY[row] = 0;
      }

      // Right endpoint: r = 1..rightCnt (at uRight = U[n] or U[U.length-p-?])
      // For the right parameter uRight = U[n] = U[(nControlPts - 1) + p?], U[U.length - p - 1] is generally safe
      const uRight = U[U.length - p - 1]; // last valid parameter
      for (let r = 1; r <= rightCnt; r++, row++) {
        const ders = basisDerivativesAll(U, p, uRight, r, n);
        for (let i = 0; i < n; i++) {
          matrixN[row][i] = ders[r][i] || 0;
        }
        // The original end tangent used similar scaling
        matrixFX[row] = 0;
        matrixFY[row] = 0;
      }
    } else if (type === BSplineType.Closed) {
      /// Closed: add p periodic continuity constraints r=0..p-1
      // Note: if interpolation equations already skip the repeated final point (interpCount = origM - 1),
      //       the interpolation equations plus these p constraints total n (a square matrix).
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
    // Final check: the number of filled rows should equal n
    if (row !== n) {
      throw new Error(
        `Equation row count does not match the number of unknowns: filled ${row} rows, expected n = ${n}. (type=${actualType}, origM=${m}, p=${p})`,
      );
    }
    // row should now equal n
    // Solve the linear system matrixN * PX = matrixFX
    const matrixPX = lu_solve(matrixN, matrixFX, false);
    const matrixPY = lu_solve(matrixN, matrixFY, false);

    this.cPoints = [];
    for (let i = 0; i < n; ++i) {
      this.cPoints[i] = { x: matrixPX[i], y: matrixPY[i], z: 0 };
    }
    return this.cPoints;
  }
}

// ---------- Helper: find span ----------
function findSpan(U: number[], p: number, u: number): number {
  const m = U.length - 1;
  const n = m - p - 1; // n = #controlPoints - 1
  if (u >= U[n + 1]) return n;
  if (u <= U[p]) return p;
  let low = p,
    high = n + 1,
    mid = Math.floor((low + high) / 2);
  while (u < U[mid] || u >= U[mid + 1]) {
    if (u < U[mid]) high = mid;
    else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

// ---------- Boehm single-knot insertion (used for the Closed mode wrap-to-clamp conversion) ----------
function boehmInsertOnce(
  P: { x: number; y: number }[],
  U: number[],
  p: number,
  u: number,
): { P: { x: number; y: number }[]; U: number[] } {
  const n = P.length - 1;
  const k = findSpan(U, p, u);
  const Q: { x: number; y: number }[] = new Array(n + 2);
  for (let i = 0; i <= k - p; i++) {
    Q[i] = { x: P[i].x, y: P[i].y };
  }
  for (let i = k - p + 1; i <= k; i++) {
    const denom = U[i + p] - U[i];
    const alpha = Math.abs(denom) > 1e-14 ? (u - U[i]) / denom : 0;
    Q[i] = {
      x: (1 - alpha) * P[i - 1].x + alpha * P[i].x,
      y: (1 - alpha) * P[i - 1].y + alpha * P[i].y,
    };
  }
  for (let i = k + 1; i <= n + 1; i++) {
    Q[i] = { x: P[i - 1].x, y: P[i - 1].y };
  }
  const newU = U.slice();
  newU.splice(k + 1, 0, u);
  return { P: Q, U: newU };
}

// Periodic wrapped control polygon + uniform knots → clamped form (same geometry, C^(p-1) smooth closure)
// Input: m unique base points; output: m+p clamped control points + m+2p+1 clamped knots
export function periodicToClamped(
  base: { x: number; y: number }[],
  p: number,
): { P: { x: number; y: number }[]; U: number[] } {
  const m = base.length;
  const periodicP: { x: number; y: number }[] = [];
  for (let i = 0; i < m; i++) periodicP.push({ x: base[i].x, y: base[i].y });
  for (let i = 0; i < p; i++) periodicP.push({ x: base[i % m].x, y: base[i % m].y });
  const n = periodicP.length;
  const periodicU: number[] = [];
  const knotCount = n + p + 1;
  for (let i = 0; i < knotCount; i++) periodicU.push(i / (knotCount - 1));

  const uStart = periodicU[p];
  const uEnd = periodicU[n];
  let curP = periodicP;
  let curU = periodicU;
  for (let i = 0; i < p; i++) {
    const r = boehmInsertOnce(curP, curU, p, uStart);
    curP = r.P;
    curU = r.U;
  }
  for (let i = 0; i < p; i++) {
    const r = boehmInsertOnce(curP, curU, p, uEnd);
    curP = r.P;
    curU = r.U;
  }
  const trimmedU = curU.slice(p, curU.length - p);
  const trimmedP = curP.slice(p, curP.length - p);
  const u0 = trimmedU[0];
  const u1 = trimmedU[trimmedU.length - 1];
  const span = u1 - u0 || 1;
  for (let i = 0; i < trimmedU.length; i++) trimmedU[i] = (trimmedU[i] - u0) / span;
  return { P: trimmedP, U: trimmedU };
}

// ---------- DersBasisFuns: return ders[r][j] (0<=r<=nd, 0<=j<=p)
// Based on The NURBS Book algorithm A2.3 (basis functions and their derivatives)
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
    let s1 = 0,
      s2 = 1;
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
      const j2 = r - 1 <= pk ? k - 1 : p - r;
      for (let j = j1; j <= j2; j++) {
        const val = (a[s1][j] || 0) - (a[s1][j - 1] || 0);
        a[s2][j] = val / ndu[pk + 1][rk + j];
        d += a[s2][j] * ndu[rk + j][pk];
      }
      if (r <= pk) {
        a[s2][k] = -(a[s1][k - 1] || 0) / ndu[pk + 1][r];
        d += a[s2][k] * ndu[r][pk];
      }
      ders[k][r] = d;
      // swap s1,s2
      const tmp = s1;
      s1 = s2;
      s2 = tmp;
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

// ---------- wrapper: return full vectors of basis functions and their derivatives
// Returns: arr[r][globalIndex] （0<=r<=nd, 0<=globalIndex<=n-1）
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

// Relative closeness check (a more robust alternative to absolute tolerance)
function nearlyEqualRel(a: number, b: number, relTol = 1e-9) {
  return Math.abs(a - b) <= relTol * Math.max(1, Math.abs(a), Math.abs(b));
}

// Intersect lines P0 + t*v0 and Q0 + s*v1; return the intersection or null (parallel or nearly parallel)
function intersectLines(P0: VectorData, v0: VectorData, Q0: VectorData, v1: VectorData, tol = 1e-12) {
  const denom = cross2d(v0, v1);
  if (Math.abs(denom) < tol) {
    return null; // parallel or nearly parallel
  }
  const w: VectorData = [Q0[0] - P0[0], Q0[1] - P0[1]];
  const t = cross2d(w, v1) / denom;
  return { x: P0[0] + t * v0[0], y: P0[1] + t * v0[1] };
}

// Project a point onto the line defined by base->dir (returns the projected point)
function projectPointToLine(pt: VectorData, base: VectorData, dir: VectorData) {
  const v = { x: pt[0] - base[0], y: pt[1] - base[1] };
  const dlen2 = dir[0] * dir[0] + dir[1] * dir[1];
  if (dlen2 === 0) return { x: base[0], y: base[1] };
  const t = (v.x * dir[0] + v.y * dir[1]) / dlen2;
  return { x: base[0] + t * dir[0], y: base[1] + t * dir[1] };
}

class BesselTangentMethod {
  // Fit a quadratic Bézier curve through three points, with t=0.5 at the middle point
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
