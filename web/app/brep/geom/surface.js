
export class Surface {

  constructor() {
    
  }
  
  intersect(other) {
    return this.toNurbs.intersect(other.toNurbs());
  };

  toNurbs() {
    throw 'not implemented';
  }

  isSameClass(other) {
    return this.constructor.name == other.constructor.name;
  }
}
Surface.prototype.isPlane = false;
