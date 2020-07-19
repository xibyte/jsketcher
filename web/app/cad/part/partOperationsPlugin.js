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


export function activate({services}) {
  services.operation.registerOperations([
    planeOperation,
    boxOperation, 
    extrudeOperation,
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
    unionOperation
  ])
}