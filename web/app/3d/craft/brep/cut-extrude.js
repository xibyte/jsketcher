import {Matrix3, BasisForPlane, ORIGIN} from '../../../math/l3space'
import * as math from '../../../math/math'
import Vector from '../../../math/vector'
import {Extruder} from '../../../brep/brep-builder'
import {BREPValidator} from '../../../brep/brep-validator'
import * as approx from '../../../brep/approx'
import {subtract, union} from '../../../brep/operations/boolean'
import {Loop} from '../../../brep/topo/loop'
import {Shell} from '../../../brep/topo/shell'
import {ReadSketchFromFace} from './sketch-reader'
import {isCurveClass} from '../../cad-utils'

import {BREPSceneSolid} from '../../scene/brep-scene-object'

export function Extrude(app, params) {
  return doOperation(app, params, false);
}

export function Cut(app, params) {
  return doOperation(app, params, true);
}

export function doOperation(app, params, cut) {
  const face = app.findFace(params.face);
  const solid = face.solid;
  const reverseNormal = !cut;
  
  let normal = face.normal();
  if (reverseNormal) normal = normal.negate();
  const sketch = ReadSketchFromFace(app, face, reverseNormal);
  
  const extruder = new ParametricExtruder(params);
  const operand = combineShells(sketch.map(s => extruder.extrude(s, normal)));
  BREPValidator.validateToConsole(operand);

  let result;
  if (solid instanceof BREPSceneSolid) {
    const op = cut ? subtract : union;
    result = op(solid.shell, operand);
    for (let newFace of result.faces) {
      if (newFace.id == face.id) {
        newFace.id = undefined;
      }
    }
  } else {
    if (cut) throw 'unable to cut plane';
    result = operand;
  }
  approx.update(result);
  const newSolid = new BREPSceneSolid(result);
  return {
    outdated: [solid],
    created:  [newSolid]
  }
}

function combineShells(shells) {
  if (shells.length == 1) {
    return shells[0];
  }
  const cutter = new Shell();
  shells.forEach(c => c.faces.forEach(f => cutter.faces.push(f)));
  return cutter;
}

export class ParametricExtruder extends Extruder {
  
  constructor(params) {
    super();
    this.params = params;
  }
  
  prepareLidCalculation(baseNormal, lidNormal) {
    let target;
    this.basis = BasisForPlane(baseNormal);
    if (this.params.rotation != 0) {
      target = Matrix3.rotateMatrix(this.params.rotation * Math.PI / 180, this.basis[0], ORIGIN).apply(lidNormal);
      if (this.params.angle != 0) {
        target = Matrix3.rotateMatrix(this.params.angle * Math.PI / 180, this.basis[2], ORIGIN)._apply(target);
      }
      target._multiply(Math.abs(this.params.value));
    } else {
      target = lidNormal.multiply(Math.abs(this.params.value));
    }
    this.target = target;
  }

  calculateLid(basePoints, baseNormal, lidNormal) {
    if (this.params.prism != 1) {
      const scale = this.params.prism;
      
      const _3Dtr = new Matrix3().setBasis(this.basis);
      const _2Dtr = _3Dtr.invert();
      const poly2d = basePoints.map(p => _2Dtr.apply(p));
      basePoints = math.polygonOffset(poly2d, scale).map(p => _3Dtr.apply(p));
    }
    return basePoints.map(p => p.plus(this.target));
  }

  onWallCallback(wallFace, baseHalfEdge) {
    const conn = baseHalfEdge.vertexA.point.sketchConnectionObject;
    if (conn && isCurveClass(conn._class)) {
      if (!conn.approxSurface) {
        conn.approxSurface = new approx.ApproxSurface();
      }
      conn.approxSurface.addFace(wallFace);
    }
  }
}
