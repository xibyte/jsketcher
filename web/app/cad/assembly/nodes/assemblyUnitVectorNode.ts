import {Param} from "../../../sketcher/shapes/param";
import Vector from "math/vector";
import {MObject} from "../../model/mobject";
import {AlgNumConstraint} from "../../../sketcher/constr/ANConstraints";
import {Constraints3D} from "../constraints3d";
import {AssemblyNode} from "../assembly";
import {AssemblyCSysNode} from "./assemblyCSysNode";

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
      // new AlgNumConstraint(Constraints3D.RigidBodyLink3x3, [body, this])
    ];
  }

}