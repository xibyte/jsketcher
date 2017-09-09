
export class Surface {

  constructor() {
    
  }

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

  normal(point) {
    throw 'not implemented';
  }

  toNurbs() {
    throw 'not implemented';
  }

  isSameClass(other) {
    return this.constructor.name === other.constructor.name;
  }
}
Surface.prototype.isPlane = false;
