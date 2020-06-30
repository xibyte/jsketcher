import {ConstantsDefinitions} from "../../sketcher/constr/ANConstraints";

export interface AssemblyConstraintDefinition {

  typeId: string;

  objects: string[];

  constants: ConstantsDefinitions
}
