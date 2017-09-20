
export class Surface {

  constructor() {
    
  }

  //--------------------------------------------------------------------------------------------------------------------
  
  intersectSurfaceForSameClass() {
    throw 'not implemented';
  }
  
  intersectSurface(other, tol) {
    if (this.isSameClass(other)) {
      return this.intersectSurfaceForSameClass(other, tol)
    }
    return this.toNurbs().intersectSurfaceForSameClass(other.toNurbs(), tol);
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
