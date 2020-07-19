import Vector from "math/vector";
import {Matrix3x4} from "math/matrix";

export class Location {

  rotationAxisAzimuth: number = 0;
  rotationAxisInclination: number = 0;
  rotationAxisAngle: number = 0;

  translation: Vector = new Vector();

  __mx = new Matrix3x4();

  toTransformationMatrix() {
    this.__mx.rotateWithSphericalAxis(
      this.rotationAxisAzimuth,
      this.rotationAxisInclination,
      this.rotationAxisAngle,
      this.translation
    );
    return this.__mx;
  }

}