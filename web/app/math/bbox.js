import Vector from './vector'

export default class BBox {
  
  constructor() {
    this.minX = Number.MAX_VALUE;
    this.minY = Number.MAX_VALUE;
    this.maxX = -Number.MAX_VALUE;
    this.maxY = -Number.MAX_VALUE;
  }
  
  checkBounds(x, y) {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
  }

  checkPoint(p) {
    this.checkBounds(p.x, p.y);
  }

  center() {
    return new Vector(this.minX + (this.maxX - this.minX) / 2, this.minY + (this.maxY - this.minY) / 2, 0)
  }

  width() {
    return this.maxX - this.minX;
  }

  height() {
    return this.maxY - this.minY;
  }

  expand(delta) {
    this.minX -= delta;
    this.minY -= delta;
    this.maxX += delta;
    this.maxY += delta;
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
