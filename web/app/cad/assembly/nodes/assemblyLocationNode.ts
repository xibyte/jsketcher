import {Param} from "../../../sketcher/shapes/param";
import {Matrix3} from "math/l3space";
import {MObject} from "../../model/mobject";
import {AlgNumConstraint} from "../../../sketcher/constr/ANConstraints";
import {Constraints3D} from "../constraints3d";
import {AssemblyNode} from "../assembly";
import Vector from "math/vector";

export class AssemblyLocationNode extends AssemblyNode {

  alpha = new Param(0, 'A');
  beta  = new Param(0, 'B');
  gamma  = new Param(0, 'G');
  dx = new Param(0, 'X');
  dy  = new Param(0, 'Y');
  dz  = new Param(0, 'Z');

  getTransformation: () => Matrix3;

  constructor(model: MObject, getTransformation: () => Matrix3) {
    super(model);
    this.getTransformation = getTransformation;
  }

  visitParams(cb) {
    cb(this.alpha);
    cb(this.beta);
    cb(this.gamma);
  }

  reset() {
    const mx = this.getTransformation();
    this.alpha.set(0);
    this.beta.set(0);
    this.gamma.set(0);
  }


  rotationMatrix() {

    return new Matrix3().set3(

      ...this.rotationComponents()

    );

  }

  rotationComponents(): [number, number, number, number, number, number, number, number, number] {

    const alpha = this.alpha.get();
    const beta = this.beta.get();
    const gamma = this.gamma.get();

    const cos = Math.cos;
    const sin = Math.sin;

    return [
      cos(alpha)*cos(beta), cos(alpha)*sin(beta)*sin(gamma) - sin(alpha)*cos(gamma), cos(alpha)*sin(beta)*cos(gamma) + sin(alpha)*sin(gamma),
      sin(alpha)*cos(beta), sin(alpha)*sin(beta)*sin(gamma) + cos(alpha)*cos(gamma), sin(alpha)*sin(beta)*cos(gamma) - cos(alpha)*sin(gamma),
      -sin(beta), cos(beta)*sin(gamma), cos(beta)*cos(gamma)
    ]
  }

  translationComponents(): [number, number, number] {
    return [this.dx.get(), this.dy.get(), this.dz.get()];
  }

  toMatrix() {
    const mx = this.rotationMatrix();
    mx.setTranslation(...this.translationComponents());
    return mx;
  }

  createConsistencyConstraints() {
    return [
      // new AlgNumConstraint(Constraints3D.CSysConsistency, [this])
    ];
  }

}