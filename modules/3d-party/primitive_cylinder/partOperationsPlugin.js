import extrudeOperation from '../craft/cutExtrude/extrudeOperation';
import cutOperation from '../craft/cutExtrude/cutOperation';
import planeOperation from '../craft/primitives/simplePlane/simplePlaneOperation';
import filletOperation from '../craft/fillet/filletOperation';
import revolveOperation from '../craft/revolve/revolveOperation';
import createDatumOperation from '../craft/datum/create/createDatumOperation';
import moveDatumOperation from '../craft/datum/move/moveDatumOperation';
import rotateDatumOperation from '../craft/datum/rotate/rotateDatumOperation';
import datumOperation from '../craft/primitives/plane/planeOperation';
import boxOperation from '../craft/primitives/box/boxOperation';
import sphereOperation from '../craft/primitives/sphere/sphereOperation';
import cylinderOperation from '../craft/primitives/cylinder/cylinderOperation';
import torusOperation from '../craft/primitives/torus/torusOperation';
import coneOperation from '../craft/primitives/cone/coneOperation';
import spatialCurveOperation from '../craft/spatialCurve/spatialCurveOperation';
import loftOperation from '../craft/loft/loftOperation';
import {intersectionOperation, subtractOperation, unionOperation} from '../craft/boolean/booleanOperation';
import { loadMDFCommand } from '../mdf/mdf';
import { MDF_EXTRUDE_EXAMPLE } from '../mdf/mdfExtrudeExample';
import { OCC_BOTTLE_OPERATION } from '3d-party/occ-bottle/bottleOperation';
import { primitive_cylinder } from '3d-party/primitive_cylinder/index';
import { primitive_box } from '3d-party/primitive_box/index';
import { primitive_cone } from '3d-party/primitive_cone/index';
//import { primitive_box } from '3d-party/primitive_sphere/index';
//import { primitive_box } from '3d-party/primitive_torus/index';


export function activate({services}) {
  services.operation.registerOperations([
    planeOperation,
    boxOperation, 
    // extrudeOperation,
    loadMDFCommand(MDF_EXTRUDE_EXAMPLE),
    cutOperation,
    revolveOperation,
    filletOperation,
    createDatumOperation,
    moveDatumOperation,
    rotateDatumOperation,
    datumOperation,
    sphereOperation,
    cylinderOperation,
    torusOperation,
    coneOperation,
    spatialCurveOperation,
    loftOperation,
    intersectionOperation,
    subtractOperation,
    unionOperation,    
    loadMDFCommand(OCC_BOTTLE_OPERATION),
    loadMDFCommand(primitive_cylinder),
    loadMDFCommand(primitive_box),
    loadMDFCommand(primitive_cone),
    loadMDFCommand(primitive_sphere),
    //loadMDFCommand(primitive_torus),
  ])
}