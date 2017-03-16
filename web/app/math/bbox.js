import Vector from './vector'

export default class BBox {
  
  constructor() {
    this.minX = Number.MAX_VALUE;
    this.minY = Number.MAX_VALUE;
    this.minZ = Number.MAX_VALUE;
    this.maxX = -Number.MAX_VALUE;
    this.maxY = -Number.MAX_VALUE;
    this.maxZ = -Number.MAX_VALUE;
  }
  
  checkBounds(x, y, z) {
    z = z || 0;
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.minZ = Math.min(this.minZ, z);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
    this.maxZ = Math.max(this.maxZ, z);
  }

  checkPoint(p) {
    this.checkBounds(p.x, p.y, p.z);
  }

  center() {
    return new Vector(this.minX + (this.maxX - this.minX) / 2, 
                      this.minY + (this.maxY - this.minY) / 2,
                      this.minZ + (this.maxZ - this.minZ) / 2)
  }

  min() {
    return new Vector(this.minX, this.minY, this.minZ)
  }

  max() {
    return new Vector(this.maxX, this.maxY, this.maxZ)
  }

  width() {
    return this.maxX - this.minX;
  }

  height() {
    return this.maxY - this.minY;
  }

  depth() {
    return this.maxZ - this.minZ;
  }

  expand(delta) {
    this.minX -= delta;
    this.minY -= delta;
    this.minZ -= delta;
    this.maxX += delta;
    this.maxY += delta;
    this.maxZ += delta;
  }

  toPolygon() {
    return [
      new Vector(this.minX, this.minY, 0),
      new Vector(this.maxX, this.minY, 0),
      new Vector(this.maxX, this.maxY, 0),
      new Vector(this.minX, this.maxY, 0)
    ];
  }
}
