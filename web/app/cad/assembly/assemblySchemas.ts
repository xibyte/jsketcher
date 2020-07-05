import {AssemblyConstraintSchema} from "./assemblyConstraint";
import {FaceTouchAlign} from "./constraints/faceTouchAlign";
import {EdgeAlign} from "./constraints/edgeAlign";

export const AssemblyConstraintsSchemas: {
  [typeId: string]: AssemblyConstraintSchema
} = {

  FaceTouchAlign, EdgeAlign

};
