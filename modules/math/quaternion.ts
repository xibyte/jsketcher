

export class Quaternion {

  x: number = 0;
  y: number = 0;
  z: number = 0;
  w: number = 1;


  setAxisAndAngle(axisX, axisY, axisZ, angle) {
    const halfAngle = angle/2;
    const sin = Math.sin(halfAngle);
    this.x = axisX*sin;
    this.y = axisY*sin;
    this.z = axisZ*sin;
    this.w = Math.cos(halfAngle);

    return this;
  }

  setSphericalAxisAndAngle(azimuth, inclination, angle) {

    this.setAxisAndAngle(
      Math.sin(azimuth) * Math.cos(inclination),
      Math.sin(azimuth) * Math.sin(inclination),
      Math.cos(azimuth),
      angle
    );

    return this;
  }

}