import {Generator} from '../id-generator'
import {SetStyle} from './draw-utils'
import {DragTool} from '../tools/drag'

export class SketchObject {
  constructor() {
    this.id = Generator.genID();
    this.aux = false;
    this.marked = null;
    this.visible = true;
    this.children = [];
    this.linked = [];
    this.layer = null;
  }

  addChild(child) {
    this.children.push(child);
    child.parent = this;
  }
  
  accept(visitor) {
    return this.acceptV(false, visitor);
  }
  
  acceptV(onlyVisible, visitor) {
    if (onlyVisible && !this.visible) return true;
    for (var i = 0; i < this.children.length; i++) {
      var child = this.children[i];
      if (!child.acceptV(onlyVisible, visitor)) {
        return false;
      }
    }
    return visitor(this);
  }
  
  validate() {
    return true;
  }
  
  recover() {
  }
  
  getDefaultTool(viewer) {
    return new DragTool(this, viewer);
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
  
  draw(ctx, scale, viewer) {
    if (!this.visible) return;
    if (this.marked != null) {
      ctx.save();
      SetStyle(this.marked, ctx, scale);
    }
    this.drawImpl(ctx, scale, viewer);
    if (this.marked != null) ctx.restore();
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].draw(ctx, scale);
    }
  }
}

