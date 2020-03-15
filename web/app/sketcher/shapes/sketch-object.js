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
    this.markers = [];
    this.children = [];
    this.layer = null;
    this.constraints = new Set();
    this.readOnly = false;
    this.fullyConstrained = false;
    this.generator = null;
    this.generators = new Set();
    this._stage = null;
  }

  get isGenerated() {
    let obj = this;
    while (obj) {
      if (obj.generator) {
        return true;
      }
      obj = obj.parent;
    }
    return false;
  }

  get stage() {
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

  addMarker(style) {
    this.markers.push(style);
    this.markers.sort((a, b) => (a.priority||99999) - (b.priority||99999))
  }

  removeMarker(style) {
    const index = this.markers.indexOf(style);
    if (index !== -1) {
      this.markers.splice(index, 1);
    }
  }

  get marked() {
    return this.markers.length !== 0;
  }

  draw(ctx, scale, viewer) {
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
    } else if (productionKind === PAST) {
      return Styles.PAST;
    } else if (productionKind === FUTURE) {
      return Styles.FUTURE;
    } else if (this.isGenerated) {
      return Styles.GENERATED;
    } else if (this.fullyConstrained) {
      return Styles.FULLY_CONSTRAINED;
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

const PAST = 1;
const CURRENT = 2;
const FUTURE = 3;