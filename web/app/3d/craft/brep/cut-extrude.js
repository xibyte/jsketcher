import {Matrix3, ORIGIN} from '../../../math/l3space'
import * as math from '../../../math/math'
import Vector from '../../../math/vector'
import {Extruder} from '../../../brep/brep-builder'
import {BREPValidator} from '../../../brep/brep-validator'
import {subtract} from '../../../brep/operations/boolean'
import {Loop} from '../../../brep/topo/loop'
import {Shell} from '../../../brep/topo/shell'
import {ReadSketchFromFace} from './sketch-reader'

import {BREPSceneSolid} from '../../scene/brep-scene-object'

export function Extrude(app, params) {
  
}

export function Cut(app, params) {
  const face = app.findFace(params.face);
  const solid = face.solid;

  const sketch = ReadSketchFromFace(app, face);
  //for (let polygon of sketch) {
  //  if (!Loop.isPolygonCCWOnSurface(polygon, face.brepFace.surface)) {
  //    polygon.reverse();
  //  }
  //}

  const extruder = new ParametricExtruder(face, params);
  const cutter = combineCutters(sketch.map(s => extruder.extrude(s, face.brepFace.surface.normal))) ;
  BREPValidator.validateToConsole(cutter);
  const result = subtract(solid.shell, cutter);
  for (let newFace of result.faces) {
    if (newFace.id == face.id) {
      newFace.id = undefined;
    }
  }
  const newSolid = new BREPSceneSolid(result);
  return {
    outdated: [solid],
    created:  [newSolid]
  }
}

function combineCutters(cutters) {
  if (cutters.length == 1) {
    return cutters[0];
  }
  const cutter = new Shell();
  cutters.forEach(c => c.faces.forEach(f => cutter.faces.push(f)));
  return cutter;
}

export class ParametricExtruder extends Extruder {
  
  constructor(face, params) {
    super();
    this.face = face;
    this.params = params;
  }
  
  prepareLidCalculation(baseNormal, lidNormal) {
    let target;
    if (this.params.rotation != 0) {
      const basis = this.face.basis();
      target = Matrix3.rotateMatrix(this.params.rotation * Math.PI / 180, basis[0], ORIGIN).apply(lidNormal);
      if (this.params.angle != 0) {
        target = Matrix3.rotateMatrix(this.params.angle * Math.PI / 180, basis[2], ORIGIN)._apply(target);
      }
      target._multiply(Math.abs(this.params.value));
    } else {
      target = lidNormal.multiply(Math.abs(this.params.value));
    }
    this.target = target;
  }

  calculateLid(basePoints) {
    if (this.params.prism != 1) {
      const scale = this.params.prism;
      const _3Dtr = this.face.brepFace.surface.get3DTransformation();
      const _2Dtr = _3Dtr.invert();
      const poly2d = basePoints.map(p => _2Dtr.apply(p));
      basePoints = math.polygonOffset(poly2d, scale).map(p => _3Dtr.apply(p));
    }
    return basePoints.map(p => p.plus(this.target));
  }
}
