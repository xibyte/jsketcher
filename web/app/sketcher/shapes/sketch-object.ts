import { Generator } from "../id-generator";
import { Shape } from "./shape";
import { Param } from "./param";
import { Styles } from "../styles";
import { NoIcon } from "../icons/NoIcon";
import { Layer, Viewer } from "../viewer2d";
import { NOOP } from "gems/func";
import { SolvableObject } from "../constr/solvableObject";

export abstract class SketchObject extends Shape implements SolvableObject {
  ref: string;
  id: string;
  parent: SketchObject = null;
  markers: any[] = [];
  children: Set<SketchObject> = new Set();
  layer: Layer = null;
  constraints: Set<any> = new Set();
  readOnly: boolean = false;
  fullyConstrained: boolean = false;
  generator: any = null;
  generators: Set<any> = new Set();
  _stage: any = null;

  protected constructor(id: string | undefined) {
    super();
    this.ref = Generator.genID() + "";
    this.id = id || this.ref;
  }

  dependsOn(obj: SketchObject): boolean {
    return false;
  }

  get isGenerated() {
    let obj: SketchObject = this;
    while (obj) {
      if (obj.generator) {
        return true;
      }
      obj = obj.parent;
    }
    return false;
  }

  get stage(): any {
    if (this._stage) {
      return this._stage;
    }
    if (this.parent) {
      return this.parent.stage;
    }
    return null;
  }

  set stage(value) {
    this._stage = value;
  }

  normalDistance(aim: { x: number; y: number }, scale: number) {
    return -1;
  }

  addChild(child: SketchObject) {
    this.children.add(child);
    child.parent = this;
  }

  accept(visitor: (obj: SketchObject) => boolean): boolean {
    for (const child of this.children) {
      if (!child.accept(visitor)) {
        return false;
      }
    }
    return visitor(this);
  }

  traverse(visitor: (obj: SketchObject) => void) {
    for (const child of this.children) {
      child.traverse(visitor);
    }
    visitor(this);
  }

  stabilize(viewer: Viewer) {}

  syncGeometry() {}

  recoverIfNecessary() {
    return false;
  }

  visitLinked(cb: (obj: SketchObject) => void) {
    cb(this);
  }

  translate(dx: number, dy: number) {
    //  this.translateImpl(dx, dy);
    if (this.readOnly) {
      return;
    }
    this.visitLinked((obj) => {
      obj.translateImpl(dx, dy);
      obj.ancestry((a) => a.syncGeometry());
    });
  }

  translateImpl(dx: number, dy: number) {
    this.accept(function (obj) {
      if (obj.TYPE === "Point") {
        obj.translate(dx, dy);
      }
      return true;
    });
  }

  addMarker(style: any) {
    this.markers.push(style);
    this.markers.sort((a, b) => (a.priority || 99999) - (b.priority || 99999));
  }

  removeMarker(style: any) {
    const index = this.markers.indexOf(style);
    if (index !== -1) {
      this.markers.splice(index, 1);
    }
  }

  get marked() {
    return this.markers.length !== 0;
  }

  abstract drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Viewer): void;

  draw(ctx: CanvasRenderingContext2D, scale: number, viewer: Viewer) {
    if (!this.visible) return;
    const customStyle = this.getCustomStyle();
    if (customStyle !== null) {
      ctx.save();
      viewer.setStyle(customStyle, ctx);
    }

    this.drawImpl(ctx, scale, viewer);
    if (customStyle !== null) ctx.restore();
  }

  getCustomStyle() {
    const productionKind = this.classify();
    if (this.markers.length !== 0) {
      return this.markers[0];
    } else if (this.isGenerated) {
      return Styles.GENERATED;
    } else if (productionKind === PAST) {
      return Styles.PAST;
    } else if (productionKind === FUTURE) {
      return Styles.FUTURE;
    } else if (this.fullyConstrained) {
      if (this.role === "construction") {
        return Styles.FULLY_CONSTRAINED_CONSTRUCTION;
      } else {
        return Styles.FULLY_CONSTRAINED;
      }
    } else {
    }
    return null;
  }

  classify() {
    if (!this.stage) {
      return CURRENT;
    }
    const thisIndex = this.stage.index;
    const activeIndex = this.stage.viewer.parametricManager.stage.index;
    if (thisIndex < activeIndex) {
      return PAST;
    } else if (thisIndex > activeIndex) {
      return FUTURE;
    } else {
      return CURRENT;
    }
  }

  copy() {
    throw "method not implemented";
  }

  mirror(dest: any, mirroringFunc: (x: number, y: number) => { x: number; y: number }) {
    const sourcePoints: SketchObject[] = [];

    pointIterator(this, (o) => {
      sourcePoints.push(o);
    });

    let i = 0;
    pointIterator(dest, (o) => {
      sourcePoints[i++].mirror(o, mirroringFunc);
    });
  }

  visitParams(callback: (param: Param) => void) {
    throw "method not implemented";
  }

  collectParams(params: Param[]) {
    this.visitParams((p) => params.push(p));
  }

  get simpleClassName() {
    return this.TYPE;
  }

  get effectiveLayer() {
    let shape: SketchObject = this;
    while (shape) {
      if (shape.layer) {
        return shape.layer;
      }
      shape = shape.parent;
    }
    return null;
  }

  getConstraintByType(typeId: string) {
    for (const c of this.constraints) {
      if (c.schema.id === typeId) {
        return c;
      }
    }
    return null;
  }

  ancestry(cb: (obj: SketchObject) => void) {
    let obj: SketchObject = this;
    while (obj) {
      cb(obj);
      obj = obj.parent;
    }
  }

  root() {
    let obj: SketchObject = this;
    while (obj.parent) {
      obj = obj.parent;
    }
    return obj;
  }

  get isRoot() {
    return this.parent === null;
  }

  get icon() {
    return NoIcon;
  }

  freeze() {
    this.visitParams((param) => {
      param.set = NOOP;
    });
  }

  get labelCenter() {
    let point: any;
    pointIterator(this, (o) => {
      if (!point) {
        point = o;
      }
    });
    return point && point.toVector();
  }

  abstract write(): SketchObjectSerializationData;
}

export interface SketchObjectSerializationData {}

export function pointIterator(shape: SketchObject, func: (o: SketchObject) => void) {
  shape.accept((o) => {
    if (o.TYPE === "Point") {
      func(o);
    }
    return true;
  });
}

const PAST = 1;
const CURRENT = 2;
const FUTURE = 3;
