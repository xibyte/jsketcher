
export class Surface {

  constructor() {
    
  }

  //--------------------------------------------------------------------------------------------------------------------

  classifyCognateCurve(curve, tol) {
    throw 'not implemented';
  }

  classifyCurve(curve, tol) {
    if (this.isCognateCurve(curve)) {
      return this.classifyCognateCurve(curve, tol)
    }
    return this.toNurbs().classifyCognateCurve(curve.toNurbs(), tol);
  };

  //--------------------------------------------------------------------------------------------------------------------
  
  intersectForSameClass() {
    throw 'not implemented';
  }
  
  intersect(other, tol) {
    if (this.isSameClass(other)) {
      return this.intersectForSameClass(other, tol)
    }
    return this.toNurbs().intersectForSameClass(other.toNurbs(), tol);
  };

  //--------------------------------------------------------------------------------------------------------------------

  coplanarUnsignedForSameClass(other, tol) {
    throw 'not implemented';
  }

  coplanarUnsigned(other, tol) {
    if (this.isSameClass(other)) {
      return this.coplanarUnsignedForSameClass(other, tol)
    }
    return this.toNurbs().coplanarUnsignedForSameClass(other.toNurbs());
  }

  //--------------------------------------------------------------------------------------------------------------------

  equalsForSameClass(other, tol) {
    throw 'not implemented';
  }
  
  equals(other, tol) {
    if (this.isSameClass(other)) {
      return this.equalsForSameClass(other, tol)
    }
    return this.toNurbs().equalsForSameClass(other.toNurbs());
  }

  //--------------------------------------------------------------------------------------------------------------------

  toNurbs() {
    throw 'not implemented';
  }

  isSameClass(other) {
    return this.constructor.name == other.constructor.name;
  }

  isCognateCurve(curve) {
    return false;
  }
}
Surface.prototype.isPlane = false;
