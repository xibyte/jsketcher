import Vector from 'math/vector';
import {XYZ} from "math/xyz";
import {Vec3} from "math/vec";

export default class BBox {

  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;

  constructor() {
    this.minX = Number.MAX_VALUE;
    this.minY = Number.MAX_VALUE;
    this.minZ = Number.MAX_VALUE;
    this.maxX = -Number.MAX_VALUE;
    this.maxY = -Number.MAX_VALUE;
    this.maxZ = -Number.MAX_VALUE;
  }
  
  checkBounds(x: number, y: number, z: number = 0): void {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.minZ = Math.min(this.minZ, z);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
    this.maxZ = Math.max(this.maxZ, z);
  }

  checkPoint(p: XYZ): void {
    this.checkBounds(p.x, p.y, p.z);
  }

  checkData([x, y, z]: Vec3): void {
    this.checkBounds(x, y, z);
  }

  center(): Vector {
    return new Vector(this.minX + (this.maxX - this.minX) / 2, 
                      this.minY + (this.maxY - this.minY) / 2,
                      this.minZ + (this.maxZ - this.minZ) / 2)
  }

  min(): Vector {
    return new Vector(this.minX, this.minY, this.minZ)
  }

  max(): Vector {
    return new Vector(this.maxX, this.maxY, this.maxZ)
  }

  width(): number {
    return this.maxX - this.minX;
  }

  height(): number {
    return this.maxY - this.minY;
  }

  depth(): number {
    return this.maxZ - this.minZ;
  }

  expand(delta: number): void {
    this.minX -= delta;
    this.minY -= delta;
    this.minZ -= delta;
    this.maxX += delta;
    this.maxY += delta;
    this.maxZ += delta;
  }

  toPolygon(): [Vector, Vector, Vector, Vector] {
    return [
      new Vector(this.minX, this.minY, 0),
      new Vector(this.maxX, this.minY, 0),
      new Vector(this.maxX, this.maxY, 0),
      new Vector(this.minX, this.maxY, 0)
    ];
  }
}
