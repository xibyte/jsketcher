import {Surface} from '../surface'
import {Curve} from '../curve'
import {Matrix3, AXIS, BasisForPlane} from  '../../../math/l3space'
import * as math from  '../../../math/math'

export class ApproxSurface extends Surface {
  constructor(mesh) {
    super();
    this.mesh = mesh;
  }
}

export class ApproxCurve extends Curve {
  constructor(segments, proto) {
    super();
    this.segments = segments;
    this.proto = proto;
  }

}
