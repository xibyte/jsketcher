import {MObject} from "../model/mobject";
import {Param} from "../../sketcher/shapes/param";
import {ISolveStage, SolvableObject} from "../../sketcher/constr/solvableObject";
import {AlgNumConstraint} from "../../sketcher/constr/ANConstraints";
import {AssemblyCSysNode} from "./nodes/assemblyCSysNode";

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

