import * as ext from '../impl/nurbs-ext';
import {distinctKnots} from '../impl/nurbs-ext';
import {ParametricCurve} from "./parametricCurve";
import {Matrix3x4Data} from "math/matrix";
import {Vec3} from "math/vec";
import {NurbsCurveData} from "geom/curves/nurbsCurveData";
import {CurveBSplineData} from "engine/data/curveData";


//in fact the sketcher format
export interface NurbsSerializaionFormat {
  degree: number,
  cp: Vec3[],
  knots: number[],
  weights: number[]
}

export default class NurbsCurve implements ParametricCurve {

  verb: any;
  data: NurbsCurveData;

  static create(degree: number, knots: number[], cp: Vec3[], weights: number[]): NurbsCurve {
    // @ts-ignore
    return new NurbsCurve(verb.geom.NurbsCurve.byKnotsControlPointsWeights(degree, knots, cp, weights));
  }

  static deserialize({degree, knots, cp, weights}: NurbsSerializaionFormat): NurbsCurve {
    return NurbsCurve.create(degree, knots, cp, weights);
  }

  constructor(verbCurve) {
    this.verb = verbCurve;
    this.data = verbCurve.asNurbs();
  }

  domain(): [number, number] {
    return ext.curveDomain(this.data);
  }

  degree(): number {
    return this.data.degree;
  }

  transform(tr: Matrix3x4Data): ParametricCurve {
    const verbCurveTr = this.verb.transform(tr);
    return new NurbsCurve(verbCurveTr);
  }

  point(u: number): Vec3 {
    return this.verb.point(u);
  }

  param(point: Vec3): number {
    return this.verb.closestParam(point);
  }

  eval(u: number, num: number): Vec3[] {
    return verb.eval.Eval.rationalCurveDerivatives(this.data, u, num);
  }

  knots(): number[] {
    return distinctKnots(this.data.knots);
  }

  invert(): ParametricCurve {

    const inverted = ext.curveInvert(this.data);
    ext.normalizeCurveParametrizationIfNeeded(inverted);
    // let [min, max] = curveDomain(curve);
    // for (let i = 0; i < reversed.knots.length; i++) {
    //   if (eqEps(reversed.knots[i], max)) {
    //     reversed.knots[i] = max;
    //   } else {
    //     break;
    //   }
    // }
    // for (let i = reversed.knots.length - 1; i >= 0 ; i--) {
    //   if (eqEps(reversed.knots[i], min)) {
    //     reversed.knots[i] = min;
    //   } else {
    //     break;
    //   }
    // }

    return new NurbsCurve(new verb.geom.NurbsCurve(inverted));
  }

  split(u: number): [ParametricCurve, ParametricCurve] {
    const split = verb.eval.Divide.curveSplit(this.data, u);
    split.forEach(n => ext.normalizeCurveParametrization(n));
    return split.map(c => new NurbsCurve(new verb.geom.NurbsCurve(c)));
  }

  serialize(): NurbsSerializaionFormat {
    return {
      degree: this.verb.degree(),
      knots: this.verb.knots(),
      cp: this.verb.controlPoints(),
      weights: this.verb.weights()
    }
  }

  asCurveBSplineData(): CurveBSplineData {
    return {
      TYPE: "B-SPLINE",
      degree: this.verb.degree(),
      knots: this.verb.knots(),
      cp: this.verb.controlPoints(),
      weights: this.verb.weights()
    }
  }
}
