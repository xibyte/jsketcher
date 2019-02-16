import * as vec from '../../app/math/math'
import {assertFaceOrigination, assertFaceRole} from './asserts';

export class SurfaceGauge {
  
  constructor(surface, rayCast) {
    this.surface = surface;
    this.rayCast = rayCast;
  }
  
  sample(u, v, delta = 10) {
    let normal = this.surface.normal(u, v);
    let pt = this.surface.point(u, v);
    let deltaV = vec.mul(normal, delta);
    let [face] = ui.rayCastFaces(vec.add(pt, deltaV), vec.sub(pt, deltaV));
    let sampleAssertations = {
      assertFaceOrigination: (sketchId, primitiveId) => {
        assertFaceOrigination(face, sketchId, primitiveId);
        return sampleAssertations;
      },
      assertFaceRole: role => {
        assertFaceRole(face, role);
        return sampleAssertations
      }
    }
  }
  
  static prism(surfaceImpl, a, b, c, d) {
    return new SurfaceGauge(surfaceImpl(1, 1, [0,0,1,1], [0,0,1,1],
      [ [ a, b] ,
        [ c, d ] ] ));
  }
}