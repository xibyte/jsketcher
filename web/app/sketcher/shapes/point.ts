import {SketchObject, SketchObjectSerializationData} from './sketch-object'
import {DrawPoint} from './draw-utils'
import Vector from 'math/vector';
import {Param} from "./param";
import {ConstraintDefinitions} from "../constr/ANConstraints";
import {dfs} from "gems/traverse";
import {SketchSegmentSerializationData} from "./segment";

export class EndPoint extends SketchObject {

  params : {
    x: Param,
    y: Param
  };

  constructor(x: number, y: number, id?: string) {
    super(id);
    this.params  = {
      x: new Param(x, 'X'),
      y: new Param(y, 'Y')
    };
  }

  get x() {
    return this.params.x.get();
  }

  set x(val) {
    this.params.x.set(val);
  }

  get y() {
    return this.params.y.get();
  }

  set y(val) {
    this.params.y.set(val);
  }

  visitParams(callback: (param: Param) => void) {
    callback(this.params.x);
    callback(this.params.y);
  }

  normalDistance(aim: Vector) {
    return aim.minus(new Vector(this.x, this.y)).length();
  }

  getReferencePoint() {
    return this;
  }

  translateImpl(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  visitLinked(cb: (obj: SketchObject) => void) {
    dfs(this, (obj, chCb) => obj.constraints.forEach(c => {
      if (c.schema.id === ConstraintDefinitions.PCoincident.id) {
        c.objects.forEach(chCb);
      }
    }), cb);
  }

  drawImpl(ctx: CanvasRenderingContext2D, scale: number) {
    DrawPoint(ctx, this.x, this.y, 3, scale)
  }

  setXY(x, y) {
    this.x = x;
    this.y = y;
  }

  setFromPoint(p: { x: number; y: number }) {
    this.setXY(p.x, p.y);
  }

  setFromArray(arr: number[]) {
    this.setXY(arr[0], arr[1]);
  }

  toVectorArray() {
    return [this.x, this.y];
  }

  toVector() {
    return new Vector(this.x, this.y);
  }

  get labelCenter() {
    return this.toVector();
  }

  copy() {
    return new EndPoint(this.x, this.y);
  }

  mirror(dest: EndPoint, mirroringFunc: (x: number, y: number) => { x: number; y: number }) {
    const {x, y} = mirroringFunc(this.x, this.y);
    dest.x = x;
    dest.y = y;
  }

  write(): SketchPointSerializationData {
    return {
      x: this.x,
      y: this.y
    }
  }

  static read(id: string, data: SketchPointSerializationData): EndPoint {
    return new EndPoint(
      data.x,
      data.y,
      id
    )
  }
}

export interface SketchPointSerializationData extends SketchObjectSerializationData {
  x: number;
  y: number;
}

EndPoint.prototype._class = 'TCAD.TWO.EndPoint';
EndPoint.prototype.TYPE = 'Point';


