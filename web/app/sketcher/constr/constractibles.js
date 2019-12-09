import {Param} from "./solver";
import {Generator} from "../id-generator";

export class ContractibleObject {

  constraints = [];

  constructor() {
  }

  createParam(value) {
    return new GCParam(this, value);
  }

  collectParams(out) {
    this.visitParams(p => out.push(p));
  }

  visitParams() {};

  visitChildren() {};

}

export class GCPoint extends ContractibleObject {

  constructor() {
    super();
    this.x = this.createParam(0);
    this.y = this.createParam(0);
  }

  visitParams(visitor) {
    visitor(this.x);
    visitor(this.y);
  }

}

export class GCLine extends ContractibleObject {

  constructor() {
    super();
    this.ang = this.createParam(0);
    this.w = this.createParam(0);
  }

  visitParams(visitor) {
    visitor(this.ang);
    visitor(this.w);
  }

}

export class GCCircle extends ContractibleObject {

  constructor() {
    super();
    this.c = new GCPoint();
    this.r = this.createParam(0);
  }

  visitParams(visitor) {
    this.c.visitParams(visitor);
    visitor(this.r);
  }

  visitChildren(visitor) {
    visitor(this.c);
  }

}

export class GCParam {

  constructor(object, value) {
    this.object = object;
    this.value = value;
  }

  set(value) {
    this.value = value;
  }

  get() {
    return this.value;
  }

}