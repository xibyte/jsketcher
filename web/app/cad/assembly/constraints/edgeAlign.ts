import {AssemblyConstraint, AssemblyConstraintSchema} from "../assemblyConstraint";
import {MObject} from "../../model/mobject";
import {NoIcon} from "../../../sketcher/icons/NoIcon";
import {AssemblyDOF} from "../dof/assemblyDOF";
import {MFace} from "../../model/mface";
import { MShell } from "../../model/mshell";
import {MEdge} from "../../model/medge";

export class EdgeAlignConstraint extends AssemblyConstraint {

  fixedEdge: MEdge;
  movingEdge: MEdge;

  constructor(schema: AssemblyConstraintSchema, fixedPart: MShell, movingPart: MShell, objects: MObject[]) {
    super(schema, fixedPart, movingPart, objects);
    this.movingEdge = objects[0] as MEdge;
    this.fixedEdge = objects[1] as MEdge;
  }

  apply(dof: AssemblyDOF) {
    return dof.applyEdgeAlign(this);
  }

}

export const EdgeAlign : AssemblyConstraintSchema = {

  id: 'EdgeAlign',
  name: 'Edge Align',
  icon: NoIcon,

  selectionMatcher: {
    selector: 'matchAll',
    types: ['edge'],
    minQuantity: 2
  },

  implementation: EdgeAlignConstraint


};