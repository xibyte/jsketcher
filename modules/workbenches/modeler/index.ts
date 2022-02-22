import {ExtrudeOperation} from './features/extrude/extrude.operation';
import {LoftOperation} from './features/loft/loft.operation'
import {WorkbenchConfig} from "cad/workbench/workbenchService";
import {PrimitiveBoxOperation} from "workbenches/modeler/features/primitiveBox";
import {PrimitiveConeOperation} from "workbenches/modeler/features/primitiveCone";
import {PrimitiveCylinderOperation} from "workbenches/modeler/features/primitiveCylinder";
import {PrimitiveSphereOperation} from "workbenches/modeler/features/primitiveSphere";
import PrimitiveTorusOperation from "workbenches/modeler/features/primitiveTorus";
import {HoleOperation} from "workbenches/modeler/features/hole";
import {FilletOperation} from "workbenches/modeler/features/fillet";
import {BooleanOperation} from "workbenches/modeler/features/boolean/boolean.operation";
import {RevolveOperation} from "workbenches/modeler/features/revolve/revolve.operation";
import {ShellOperation} from "workbenches/modeler/features/shell/shell.operation";

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
  ],
  actions: [],
  ui:{
    toolbar: [
      'DATUM_CREATE', 'PLANE', 'EditFace', '-',
      "OCC_BOTTLE", '-',
      "EXTRUDE", "REVOLVE", "LOFT","-", "BOOLEAN", "SHELL_TOOL",
      "PRIMITIVE_CYLINDER",
      "PRIMITIVE_BOX",
      "PRIMITIVE_CONE",
      "PRIMITIVE_SPHERE",
      "PRIMITIVE_TORUS",
      "HOLE_TOOL",
      "FILLET_TOOL"
    ]
  }
}