
export class Surface {

  constructor() {
    
  }
  
  intersect(other) {
    return this.toNurbs.intersect(other.toNurbs());
  };

  toNurbs() {
    throw 'not implemented';
  }

  coplanarUnsignedForSameClass(other, tol) {
    throw 'not implemented';
  }

  equalsUnsignedForSameClass(other, tol) {
    throw 'not implemented';
  }

  isSameClass(other) {
    return this.constructor.name == other.constructor.name;
  }
  
  coplanarUnsigned(other, tol) {
    if (this.isSameClass(other)) {
      return this.coplanarUnsignedForSameClass(other, tol)
    }
    return this.toNurbs().coplanarUnsignedForSameClass(other.toNurbs());
  }

  equals(other, tol) {
    if (this.isSameClass(other)) {
      return this.equalsForSameClass(other, tol)
    }
    return this.toNurbs().equalsForSameClass(other.toNurbs());
  }
}
Surface.prototype.isPlane = false;
