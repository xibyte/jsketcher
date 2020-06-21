import Vector from "math/vector";
import {Matrix3} from "math/l3space";

export class Location {

  rotationAxisAzimuth: number = 0;
  rotationAxisInclination: number = 0;
  rotationAxisAngle: number = 0;

  translation: Vector = new Vector();

  __mx = new Matrix3();

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