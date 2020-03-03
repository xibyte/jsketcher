import {Generator} from '../id-generator'
import {Shape} from './shape'
import {Types} from '../io';
import {Styles} from "../styles";
import {dfs} from 'gems/traverse';
import {ConstraintDefinitions} from "../constr/ANConstraints";

export class SketchObject extends Shape {
  constructor() {
    super();
    this.id = Generator.genID();
    this.marked = null;
    this.children = [];
    this.layer = null;
    this.fullyConstrained = false;
    this.constraints = new Set();
    this.readOnly = false;
  }

  normalDistance(aim, scale) {
    return -1;
  }
  
  addChild(child) {
    this.children.push(child);
    child.parent = this;
  }
  
  accept(visitor) {
    for (let child of this.children) {
      if (!child.accept(visitor)) {
        return false;
      }
    }
    return visitor(this);
  }

  stabilize(viewer) {
  }

  syncGeometry() {
  }

  recoverIfNecessary() {
    return false;
  }

  visitLinked(cb) {
    cb(this);
  }

  translate(dx, dy) {
  //  this.translateImpl(dx, dy);
    if (this.readOnly) {
      return;
    }
    this.visitLinked(obj => {
      obj.translateImpl(dx, dy);
      obj.ancestry(a => a.syncGeometry());
    });
  }

  translateImpl(dx, dy) {
    this.accept(function (obj) {
      if (obj._class === 'TCAD.TWO.EndPoint') {
        obj.translate(dx, dy);
      }
      return true;
    });
  }
  
  draw(ctx, scale, viewer) {
    if (!this.visible) return;
    if (this.marked != null) {
      ctx.save();
      viewer.setStyle(this.marked, ctx);
    } else if (this.fullyConstrained) {
      ctx.save();
      viewer.setStyle(Styles.FULLY_CONSTRAINED, ctx);
    }

    this.drawImpl(ctx, scale, viewer);
    if (this.marked != null || this.fullyConstrained) ctx.restore();
  }
  
  copy() {
    throw 'method not implemented';
  }
  
  mirror(dest, mirroringFunc) {

    let sourcePoints = [];

    pointIterator(this, o => {
      sourcePoints.push(o);
    });

    let i = 0;
    pointIterator(dest, o => {
      sourcePoints[i++].mirror(o, mirroringFunc);
    });
  }
  
  visitParams(callback) {
    throw 'method not implemented';
  }

  collectParams(params) {
    this.visitParams(p => params.push(p));
  }
  
  get simpleClassName() {
    return this._class.replace('TCAD.TWO.', '');
  }
  
  get effectiveLayer() {
    let shape = this;
    while (shape) {
      if (shape.layer) {
        return shape.layer;
      }
      shape = shape.parent;
    }
    return null;
  }

  getConstraintByType(typeId) {
    for (let c of this.constraints) {
      if (c.schema.id === typeId) {
        return c;
      }
    }
    return null;
  }

  ancestry(cb) {
    let obj = this;
    while (obj) {
      cb(obj);
      obj = obj.parent;
    }
  }
}

export function pointIterator(shape, func) {
  shape.accept(o => {
    if (o._class === Types.POINT) {
      func(o);
    }
    return true;
  });
}

