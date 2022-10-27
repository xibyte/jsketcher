import {WorkbenchConfig} from "cad/workbench/workbenchService";

//imports of feature history type commands
import {PrimitiveBoxOperation} from './features/primitiveBox/primitiveBox.operation';
import {ExtrudeOperation} from './features/extrude/extrude.operation';
import {LoftOperation} from './features/loft/loft.operation'
import {PrimitiveConeOperation} from "./features/primitiveCone/PrimitiveCone.operation";
import {PrimitiveCylinderOperation} from "./features/primitiveCylinder/PrimitiveCylinder.operation";
import {PrimitiveSphereOperation} from "./features/primitiveSphere/PrimitiveSphere.operation";
import {PrimitiveTorusOperation} from "./features/primitiveTorus/PrimitiveTorus.operation";
import {HoleOperation} from "./features/hole/Hole.operation";
import {FilletOperation} from "./features/fillet/fillet.operation";
import {BooleanOperation} from "./features/boolean/boolean.operation";
import {RevolveOperation} from "./features/revolve/revolve.operation";
import {ShellOperation} from "./features/shell/shell.operation";
import {SweepOperation} from "./features/sweep/sweep.operation";
import {ScaleOperation} from "./features/scaleBody/scaleBody.operation";
import {MirrorBodyOperation} from "./features/mirrorBody/mirrorBody.operation";
import {PatternLinearOperation} from "./features/patternLinear/patternLinear.operation";
import {PatternRadialOperation} from "./features/patternRadial/patternRadial.operation";
import {ImportModelOperation} from "./features/importModel/importModel.operation";
import {DeleteBodyOperation} from "./features/deleteBody/deleteBody.operation";
import {DefeatureRemoveFaceOperation} from "./features/defeatureRemoveFace/defeatureRemoveFace.operation";
import { WireLineOperation } from "./features/wireLine/wireLine";
import { MoveBodyOperation } from "./features/moveBody/moveBody.operation"
//imports of action type commands
import {GetInfo} from "./actions/getInfo/getInfo.action";
import {ExportBREP} from "./actions/exportBREP/exportBREP.action";
//import workbench icon
import {GiCubes} from "react-icons/gi";


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
    ScaleOperation,
    MirrorBodyOperation,
    PatternLinearOperation,
    PatternRadialOperation,
    ImportModelOperation,
    DeleteBodyOperation,
    DefeatureRemoveFaceOperation,
    WireLineOperation,
    MoveBodyOperation,

    GetInfo,
    ExportBREP,
  ],
  actions: [
     //GetVolume,
  ],
  ui: {
    toolbar: [
      'DATUM_CREATE', 'PLANE', 'EditFace', '-',

      "EXTRUDE", "CUT", "REVOLVE", "LOFT", "SWEEP", "-",

      "BOOLEAN", "UNION", "SUBTRACT", "INTERSECT", "-",

      "SHELL_TOOL", "FILLET_TOOL", "SCALE_BODY", "DEFEATURE_REMOVE_FACE", "-",

      "MIRROR_BODY", "PATTERN_LINEAR", "PATTERN_RADIAL", "MOVE_BODY" ,"-",

      "CYLINDER", "BOX", "CONE", "SPHERE", "TORUS", "-",

      "HOLE_TOOL", "-", 'GET_INFO', "IMPORT_MODEL", "DELETE_BODY", "-",
      
      "WIRE_LINE", 'EXPORT_BREP',
    ]
  },
  icon: GiCubes
}