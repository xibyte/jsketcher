import {Param} from "../../../sketcher/shapes/param";
import Vector from "math/vector";
import {MObject} from "../../model/mobject";
import {AlgNumConstraint} from "../../../sketcher/constr/ANConstraints";
import {Constraints3D} from "../constraints3d";
import {AssemblyNode} from "../assembly";
import {AssemblyCSysNode} from "./assemblyCSysNode";
import {clamp} from "../../../math/math";
import {AssemblyLocationNode} from "./assemblyLocationNode";

export class AssemblyPlaneNode extends AssemblyNode {

  theta = new Param(0, 'T');
  phi  = new Param(0, 'P');
  w = new Param(0, 'W');
  getNormal: () => Vector;
  getDepth: () => number;

  constructor(model: MObject, getNormal: () => Vector, getDepth: () => number) {
    super(model);
    this.getNormal = getNormal;
    this.getDepth = getDepth;
  }

  visitParams(cb) {
    cb(this.theta);
    cb(this.phi);
    cb(this.w);
  }

  reset() {
    const {x, y, z} = this.getNormal();
    const w = this.getDepth();
    const phi = Math.atan2(y, x);
    const theta = Math.acos(clamp(z, -1, 1));

    this.theta.set(theta);
    this.phi.set(phi);

    this.w.set(w);
  }

  toNormalVector() {
    const theta = this.theta.get();
    const phi = this.phi.get();
    return new Vector(
      Math.sin(theta) * Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
      Math.cos(theta),
    )
  }

  createConsistencyConstraints() {
    return [

    ];
  }


  createOrientationRelationship(location: AssemblyLocationNode): AlgNumConstraint[] {
    return [new AlgNumConstraint(Constraints3D.PlaneNormalLink, [location, this])];
  }

  createTranslationRelationship(location: AssemblyLocationNode): AlgNumConstraint[] {
    return [new AlgNumConstraint(Constraints3D.PlaneDepthLink, [location, this])];
  }

}