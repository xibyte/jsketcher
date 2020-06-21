import {MObject} from "../model/mobject";
import {Param} from "../../sketcher/shapes/param";
import Vector from "math/vector";
import {Matrix3} from "math/l3space";
import {ISolveStage, SolvableObject} from "../../sketcher/constr/solvableObject";
import {AlgNumConstraint} from "../../sketcher/constr/ANConstraints";
import {Constraints3D} from "./constraints3d";

export abstract class AssemblyNode implements SolvableObject {

  constraints: Set<AlgNumConstraint> = new Set();

  model: MObject;

  stage: ISolveStage;

  id: string;

  protected constructor(model: MObject) {
    this.model = model;
    this.id = 'assembly-node:' + model.id;
  }

  abstract visitParams(cb);

  abstract reset();

  createConsistencyConstraints(): AlgNumConstraint[] {
    return [];
  }

  createRigidBodyLink(body: AssemblyCSysNode): AlgNumConstraint[] {
    return [];
  }

  get params(): Param[] {
    const paramArray = [];
    this.visitParams(p => paramArray.push(p));
    return paramArray;
  }

}

export class AssemblyUnitVectorNode extends AssemblyNode {

  x = new Param(0, 'X');
  y = new Param(0, 'Y');
  z = new Param(0, 'Z');
  getVector: () => Vector;

  constructor(model: MObject, getVector: () => Vector) {
    super(model);
    this.getVector = getVector;
  }

  visitParams(cb) {
    cb(this.x);
    cb(this.y);
    cb(this.z);
  }

  reset() {
    const {x, y, z} = this.getVector();
    this.x.set(x);
    this.y.set(y);
    this.z.set(z);
  }

  createConsistencyConstraints() {
    return [
      new AlgNumConstraint(Constraints3D.UnitVectorConsistency, [this])
    ];
  }

  createRigidBodyLink(body: AssemblyCSysNode) {
    return [
      new AlgNumConstraint(Constraints3D.RigidBodyLink3x3, [body, this])
    ];
  }

}

export class AssemblyCSysNode extends AssemblyNode {

  ox = new Param(0, 'X');
  oy = new Param(0, 'Y');
  oz = new Param(0, 'Z');
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
    cb(this.ox);
    cb(this.oy);
    cb(this.oz);
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
    this.ox.set(mx.tx);
    this.oy.set(mx.ty);
    this.oz.set(mx.tz);

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