import {Param} from "../../../sketcher/shapes/param";
import Vector from "math/vector";
import {MObject} from "../../model/mobject";
import {AlgNumConstraint} from "../../../sketcher/constr/ANConstraints";
import {Constraints3D} from "../constraints3d";
import {AssemblyNode} from "../assembly";
import {AssemblyCSysNode} from "./assemblyCSysNode";

export class AssemblyPlaneNode extends AssemblyNode {

  x = new Param(0, 'X');
  y = new Param(0, 'Y');
  z = new Param(0, 'Z');
  w = new Param(0, 'W');
  getNormal: () => Vector;
  getDepth: () => number;

  constructor(model: MObject, getNormal: () => Vector, getDepth: () => number) {
    super(model);
    this.getNormal = getNormal;
    this.getDepth = getDepth;
  }

  visitParams(cb) {
    cb(this.x);
    cb(this.y);
    cb(this.z);
    cb(this.w);
  }

  reset() {
    const {x, y, z} = this.getNormal();
    const w = this.getDepth();
    this.x.set(x);
    this.y.set(y);
    this.z.set(z);
    this.w.set(w);
  }

  createConsistencyConstraints() {
    return [
      new AlgNumConstraint(Constraints3D.UnitVectorConsistency, [this])
    ];
  }


  createRigidBodyLink(body: AssemblyCSysNode) {
    return [
      new AlgNumConstraint(Constraints3D.RigidBodyPlaneLink, [body, this])
    ];
  }

}