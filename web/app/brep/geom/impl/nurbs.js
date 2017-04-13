import verb from 'verb-nurbs'
import {Matrix3} from  '../../../math/l3space'
import Vector from  '../../../math/vector'

export class NurbsCurve {

  constructor(verbCurve) {
    this.verb = verbCurve;
  }

  translate(vector) {
    const tr = new Matrix3().translate(vector.x, vector.y, vector.z).toArray();
    return new NurbsCurve(this.verb.transform(tr));
  }
  
  approximate(resolution, from, to, out) {
    const off = out.length;
    let u = this.verb.closestParam(from.toArray());
    let endU = this.verb.closestParam(to.toArray());
    const reverse = u > endU;
    if (reverse) {
      const tmp = u;
      u = endU;
      endU = tmp;
    }

    const length = this.verb.lengthAtParam(endU) - this.verb.lengthAtParam(u);
    if (length < resolution) {
      return 
    }
    const step = this.verb.paramAtLength(length / resolution);
    u += step;
    for (;u < endU; u += step) {
      out.push(new Vector().set3(this.verb.point(u)));
    }
    if (reverse) {
      for (let i = off, j = out.length - 1; i != j; ++i, --j) {
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
    }
  }
}

export class NurbsSurface {
  
  constructor(verbSurface) {
    this.verb = verbSurface;
  }
  
}