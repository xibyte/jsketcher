import { ExtrudeOperation } from './features/extrude/extrude.operation';
import { LoftOperation } from './features/loft/loft.operation'
import { WorkbenchConfig } from "cad/workbench/workbenchService";
import { PrimitiveBoxOperation } from "./features/primitiveBox";
import { PrimitiveConeOperation } from "./features/primitiveCone";
import { PrimitiveCylinderOperation } from "./features/primitiveCylinder";
import { PrimitiveSphereOperation } from "./features/primitiveSphere";
import { PrimitiveTorusOperation } from "./features/primitiveTorus/index";
import { HoleOperation } from "./features/hole";
import { FilletOperation } from "./features/fillet";
import { BooleanOperation } from "./features/boolean/boolean.operation";
import { RevolveOperation } from "./features/revolve/revolve.operation";
import { ShellOperation } from "./features/shell/shell.operation";
import { SweepOperation } from "./features/sweep/sweep.operation";
import { offsetOperation } from "./features/offsetFace/offsetFace.operation"

export const ModelerWorkspace: WorkbenchConfig = {

  workbenchId: 'modeler',
  features: [
    ExtrudeOperation,
    PrimitiveBoxOperation,
    PrimitiveConeOperation,
    PrimitiveCylinderOperation,
    PrimitiveSphereOperation,
    PrimitiveTorusOperation,
    HoleOperation,
    FilletOperation,
    RevolveOperation,
    BooleanOperation,
    ShellOperation,
    LoftOperation,
    SweepOperation,
    offsetOperation
  ],
  actions: [],
  ui: {
    toolbar: [
      'DATUM_CREATE', 'PLANE', 'EditFace', '-',
      "EXTRUDE", "REVOLVE", "LOFT", "SWEEP", "-", 
      "BOOLEAN", "-", 
      "SHELL_TOOL", "FILLET_TOOL", "OFFSET_TOOL", "-",
      "PRIMITIVE_CYLINDER", "PRIMITIVE_BOX", "PRIMITIVE_CONE", "PRIMITIVE_SPHERE", "PRIMITIVE_TORUS", "-",
      "HOLE_TOOL", "-",
      "OCC_BOTTLE", '-',
    ]
  }
}