import {Generator} from "../id-generator";

export class ContractibleObject {

  constraints = [];

  constructor() {
    this.id = Generator.genID();
  }

  collectParams(out) {
    this.visitParams(p => out.push(p));
  }

  init() {}

  visitParams() {}

  visitChildren() {}

  traverse(visitor) {
    visitor(this);
  }

  write() {
    const out = [];
    this.visitChildren(c => out.push(c.id));
    return out;
  }

  read(data, resolve) {
    this.init.apply(this, data.map(resolve));
  }
}

export class GCPoint extends ContractibleObject {

  static TYPE = 'GCPoint';

  static newInstance(x = 0, y = 0) {
    return new GCPoint().init(new GCParam(x), new GCParam(y));
  }

  init(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  visitParams(visitor) {
    visitor(this.x);
    visitor(this.y);
  }

  visitChildren(visitor) {
    visitor(this.x);
    visitor(this.y);
  }

  traverse(visitor) {
    super.traverse(visitor);
    this.x.traverse(visitor);
    this.y.traverse(visitor);
  }

  write() {
    return [this.x.id, this.y.id];
  }

}

export class GCLine extends ContractibleObject {

  static TYPE = 'GCLine';

  static newInstance(ang = 0, w = 0) {
    return new GCLine().init(new GCParam(ang), new GCParam(w));
  }

  init(ang, w) {
    this.ang = ang;
    this.w = w;
    return this;
  }

  visitParams(visitor) {
    visitor(this.ang);
    visitor(this.w);
  }

  visitChildren(visitor) {
    visitor(this.ang);
    visitor(this.w);
  }

  traverse(visitor) {
    super.traverse(visitor);
    this.ang.traverse(visitor)
    this.w.traverse(visitor)
  }

}

export class GCCircle extends ContractibleObject {

  static TYPE = 'GCCircle';

  static newInstance(x, y, r) {
    return GCCircle().init(new GCPoint(x, y), new GCParam(r))
  }

  init(c, r) {
    this.c = c;
    this.r = r;
    return this;
  }

  visitParams(visitor) {
    this.c.visitParams(visitor);
    visitor(this.r);
  }

  visitChildren(visitor) {
    visitor(this.c);
    visitor(this.r);
  }

  traverse(visitor) {
    visitor(this);
    this.c.traverse(visitor);
    this.r.traverse(visitor);
  }

}

export class GCParam extends ContractibleObject {

  static TYPE = 'GCParam';

  static newInstance(value = 0) {
    return new GCParam(value);
  }

  constructor(value) {
    super();
    this.value = value;
  }

  set(value) {
    this.value = value;
  }

  get() {
    return this.value;
  }

  visitChildren(visitor) {
  }

  visitParams(visitor) {
    visitor(this);
  }

  write() {
    return this.value;
  }

  read(data) {
    this.value = data;
  }

}

export const GC_TYPES = {

  [GCParam.TYPE]: GCParam,
  [GCPoint.TYPE]: GCPoint,
  [GCLine.TYPE]: GCLine,
  [GCCircle.TYPE]: GCCircle

};