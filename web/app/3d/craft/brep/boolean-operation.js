import {subtract, union, intersect} from '../../../brep/operations/boolean'
import {BREPSceneSolid} from '../../scene/brep-scene-object'
import {update as updateStitching} from '../../../brep/stitching'
import {BREPValidator} from '../../../brep/brep-validator'
import {Shell} from '../../../brep/topo/shell'

const BoolOpMap = {
  'subtract': subtract,
  'union': union,
  'intersect': intersect
}

export function BooleanOperation(face, solid, operand, operationType) {
  let result;
 if (solid instanceof BREPSceneSolid) {
   const op = BoolOpMap[operationType];
   result = op(solid.shell, operand);
   for (let newFace of result.faces) {
     if (newFace.id == face.id) {
       newFace.id = undefined;
     }
   }
 } else {
   if (operationType != 'union') throw 'unable to cut plane';
   result = operand;
 }
 updateStitching(result);
  const newSolid = new BREPSceneSolid(result);
  return {
    outdated: [solid],
    created:  [newSolid]
  }
}

export function combineShells(shells) {
  if (shells.length == 1) {
    return shells[0];
  }
  const operand = new Shell();
  shells.forEach(c => c.faces.forEach(f => operand.faces.push(f)));
  BREPValidator.validateToConsole(operand);
  return operand;
}
