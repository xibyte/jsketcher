export class PointOnSurface {

  static from(surface, u, v) {
    return new PointOnSurface(surface, [u, v], undefined);
  }

  static fromUV(surface, u, v) {
    return new PointOnSurface(surface, [u, v], undefined);
  }
  
  constructor(surface, uv, xyz) {
    this.surface = surface;
    this._uv = uv;
    this._xyz = xyz;
  }

  get uv() {
    if (this._uv) {
      this._uv = this.surface.param(this._xyz);
    }
    return this._uv;
  }
  
  get xyz() {
    if (this._xyz) {
      this._xyz = this.surface.point(this._uv);
    }
    return this._xyz;
  }

  get u() {
    return this.uv[0];
  }

  get v() {
    return this.uv[1];
  }

  get x() {
    return this.xyz[0];
  }

  get y() {
    return this.xyz[1];
  }

  get z() {
    return this.xyz[2];
  }
}