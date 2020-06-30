import {Param} from "../../../sketcher/shapes/param";
import {Matrix3} from "math/l3space";
import {MObject} from "../../model/mobject";
import {AlgNumConstraint} from "../../../sketcher/constr/ANConstraints";
import {Constraints3D} from "../constraints3d";
import {AssemblyNode} from "../assembly";

export class AssemblyOrientationNode extends AssemblyNode {

  ix = new Param(1, 'X');
  iy = new Param(0, 'Y');
  iz = new Param(0, 'Z');
  jx = new Param(0, 'X');
  jy = new Param(1, 'Y');
  jz = new Param(0, 'Z');
  kx = new Param(0, 'X');
  ky = new Param(0, 'Y');
  kz = new Param(1, 'Z');
  getTransformation: () => Matrix3;

  constructor(model: MObject, getTransformation: () => Matrix3) {
    super(model);
    this.getTransformation = getTransformation;
  }

  visitParams(cb) {
    cb(this.ix);
    cb(this.iy);
    cb(this.iz);
    cb(this.jx);
    cb(this.jy);
    cb(this.jz);
    cb(this.kx);
    cb(this.ky);
    cb(this.kz);
  }

  reset() {
    const mx = this.getTransformation();

    this.ix.set(mx.mxx);
    this.iy.set(mx.myx);
    this.iz.set(mx.mzx);

    this.jx.set(mx.mxy);
    this.jy.set(mx.myy);
    this.jz.set(mx.mzy);

    this.kx.set(mx.mxz);
    this.ky.set(mx.myz);
    this.kz.set(mx.mzz);

  }

  createConsistencyConstraints() {
    return [
      new AlgNumConstraint(Constraints3D.CSysConsistency, [this])
    ];
  }

}