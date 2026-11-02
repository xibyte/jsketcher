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
import {ScaleBodyPivotOperation} from "./features/scaleBody/scaleBodyPivot.operation";
import {MirrorBodyOperation} from "./features/mirrorBody/mirrorBody.operation";
import {PatternLinearOperation} from "./features/patternLinear/patternLinear.operation";
import {PatternRadialOperation} from "./features/patternRadial/patternRadial.operation";
import {ImportModelOperation} from "./features/importModel/importModel.operation";
import {DeleteBodyOperation} from "./features/deleteBody/deleteBody.operation";
import {DefeatureRemoveFaceOperation} from "./features/defeatureRemoveFace/defeatureRemoveFace.operation";
import { WireLineOperation } from "./features/wireLine/wireLine";
import { MoveBodyOperation } from "./features/moveBody/moveBody.operation"
import {MoveBodyXYZOperation} from "./features/moveBody/moveBodyXYZ.operation"
import {RotateBodyAxisOperation} from "./features/moveBody/rotateBodyAxis.operation"
import {NativeMeshBoxOperation} from './features/nativeMesh/nativeBox.operation';
import {NativeMeshBooleanOperation} from './features/nativeMesh/nativeBoolean.operation';
import {SubDBoxOperation} from "./features/subdBox/subdBox.operation";
import {SubDSphereOperation} from "./features/subdSphere/subdSphere.operation";
import {SubDCylinderOperation} from "./features/subdCylinder/subdCylinder.operation";
import {PatchPlaneAction} from "surfacing/ops/plane/plane.action";
import {PatchBoxAction} from "surfacing/ops/box/box.action";
import {PatchCylinderAction} from "surfacing/ops/cylinder/cylinder.action";
import {PatchInsertLoopAction} from "./features/patchInsertLoop/patchInsertLoop.operation";
import {PatchBridgeAction} from "./features/patchBridge/patchBridge.action";
import {PatchFillHoleAction} from "./features/patchFillHole/patchFillHole.action";
//imports of action type commands
import {GetInfo} from "./actions/getInfo/getInfo.action";
import {MeasureEdgeAction} from "./actions/getInfo/measureEdge.action";
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
    ScaleBodyPivotOperation,
    MirrorBodyOperation,
    PatternLinearOperation,
    PatternRadialOperation,
    ImportModelOperation,
    DeleteBodyOperation,
    DefeatureRemoveFaceOperation,
    WireLineOperation,
    MoveBodyOperation,
    MoveBodyXYZOperation,
    RotateBodyAxisOperation,
    NativeMeshBoxOperation,
    NativeMeshBooleanOperation,
    SubDBoxOperation,
    SubDSphereOperation,
    SubDCylinderOperation,

    GetInfo,
    ExportBREP,
  ],
  actions: [
    MeasureEdgeAction,
    PatchPlaneAction,
    PatchBoxAction,
    PatchCylinderAction,
    PatchInsertLoopAction,
    PatchBridgeAction,
    PatchFillHoleAction,
  ],
  ui: {
    toolbar: [
      'DATUM_CREATE', 'PLANE', 'EditFace', '-',

      "EXTRUDE", "CUT", "REVOLVE", "LOFT", "SWEEP", "-",

      "BOOLEAN", "UNION", "SUBTRACT", "INTERSECT", "-",

      "SHELL_TOOL", "FILLET_TOOL", "SCALE_BODY_PIVOT", "DEFEATURE_REMOVE_FACE", "-",

      "MIRROR_BODY", "PATTERN_LINEAR", "PATTERN_RADIAL", "MOVE_BODY", "MOVE_BODY_XYZ", "ROTATE_BODY_AXIS", "-",

      "CYLINDER", "BOX", "CONE", "SPHERE", "TORUS", "-",

      "HOLE_TOOL", "-", 'MEASURE_EDGE_ENDPOINTS', "IMPORT_MODEL", "DELETE_BODY", "-",

      "WIRE_LINE", 'EXPORT_BREP', "-",

      "NATIVE_MESH_BOX", "NATIVE_MESH_BOOLEAN", "-",

      "SUBD_BOX", "SUBD_SPHERE", "SUBD_CYLINDER", "-",

      "PATCH_PLANE", "PATCH_BOX", "PATCH_CYLINDER", "PATCH_INSERT_LOOP", "PATCH_BRIDGE", "PATCH_FILL_HOLE",
    ]
  },
  icon: GiCubes
}