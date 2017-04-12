import verb from 'verb-nurbs'
import {Matrix3} from  '../../../math/l3space'

export class NurbsCurve {

  constructor(verbCurve) {
    this.verb = verbCurve;
  }

  translate(vector) {
    const tr = new Matrix3().translate(vector.x, vector.y, vector.z).toArray();
    return new NurbsCurve(this.verb.transform(tr));
  }
}

export class NurbsSurface {
  
  constructor(verbSurface) {
    this.verb = verbSurface;
  }
  
}