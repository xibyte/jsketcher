import {Generator} from '../id-generator'
import {Shape} from './shape'

export class SketchObject extends Shape {
  constructor() {
    super();
    this.id = Generator.genID();
    this.aux = false;
    this.marked = null;
    this.children = [];
    this.linked = [];
    this.layer = null;
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

  recoverIfNecessary() {
    return false;
  }
  
  isAuxOrLinkedTo() {
    if (!!this.aux) {
      return true;
    }
    for (var i = 0; i < this.linked.length; ++i) {
      if (!!this.linked[i].aux) {
        return true;
      }
    }
    return false;
  }
  
  _translate(dx, dy, translated) {
    translated[this.id] = 'x';
    for (var i = 0; i < this.linked.length; ++i) {
      if (translated[this.linked[i].id] != 'x') {
        this.linked[i]._translate(dx, dy, translated);
      }
    }
    this.translateImpl(dx, dy);
  };
  
  translate(dx, dy) {
  //  this.translateImpl(dx, dy);
    if (this.isAuxOrLinkedTo()) {
      return;
    }
    this._translate(dx, dy, {});
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
    }
    this.drawImpl(ctx, scale, viewer);
    if (this.marked != null) ctx.restore();
  }
  
  copy() {
    throw 'method not implemented';
  }
}

